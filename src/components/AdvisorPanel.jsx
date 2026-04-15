import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, RefreshCw } from 'lucide-react';

/**
 * AdvisorPanel
 *
 * A collapsible floating panel that streams Claude's strategic advice
 * based on the current simulation state (stats + placements + bounds).
 */
export default function AdvisorPanel({ stats, placements, bounds }) {
  const [open, setOpen]         = useState(false);
  const [text, setText]         = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const abortRef                = useRef(null);

  const analyse = useCallback(async () => {
    // Cancel any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setText('');
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/advise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stats, placements, bounds }),
        signal: controller.signal,
      });

      if (!res.ok) throw new Error(`Server error ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // keep incomplete line

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6).trim();
          if (payload === '[DONE]') break;
          try {
            const { text: chunk, error: err } = JSON.parse(payload);
            if (err) throw new Error(err);
            if (chunk) setText((prev) => prev + chunk);
          } catch { /* skip malformed events */ }
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError('Could not reach the advisor. Check your API key and try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [stats, placements, bounds]);

  const handleOpen = () => {
    setOpen(true);
    if (!text && !loading) analyse();
  };

  const handleClose = () => {
    abortRef.current?.abort();
    setOpen(false);
  };

  // Format streamed text into paragraphs split on blank lines
  const paragraphs = text.split(/\n\n+/).filter(Boolean);

  return (
    <>
      {/* Trigger button — top right, below the tool hint */}
      <motion.button
        className="advisor-trigger"
        onClick={handleOpen}
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
        title="AI Advisor"
      >
        <Sparkles size={15} />
        <span>AI Advisor</span>
      </motion.button>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.aside
            className="advisor-panel"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 16 }}
            transition={{ duration: 0.25 }}
          >
            {/* Header */}
            <div className="advisor-panel__header">
              <div className="advisor-panel__title">
                <Sparkles size={14} />
                <span>AI Advisor</span>
              </div>
              <div className="advisor-panel__actions">
                <button
                  className="advisor-icon-btn"
                  onClick={analyse}
                  disabled={loading}
                  title="Refresh"
                >
                  <RefreshCw size={13} className={loading ? 'spin' : ''} />
                </button>
                <button
                  className="advisor-icon-btn"
                  onClick={handleClose}
                  title="Close"
                >
                  <X size={13} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="advisor-panel__body">
              {error && (
                <p className="advisor-error">{error}</p>
              )}

              {loading && !text && (
                <div className="advisor-skeleton">
                  <div className="advisor-skeleton__line" style={{ width: '88%' }} />
                  <div className="advisor-skeleton__line" style={{ width: '72%' }} />
                  <div className="advisor-skeleton__line" style={{ width: '80%' }} />
                </div>
              )}

              {paragraphs.map((para, i) => (
                <p key={i} className="advisor-para">{para}</p>
              ))}

              {loading && text && (
                <span className="advisor-cursor" aria-hidden="true" />
              )}
            </div>

            {/* Footer */}
            <div className="advisor-panel__footer">
              Powered by Claude · based on live simulation data
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
