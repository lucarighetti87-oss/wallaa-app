import { useEffect, useRef, useState } from 'react';
import {
  getWallaaCentralMessages,
  sendWallaaCentralMessage
} from '../services/network.js';

export default function CentralSosChat({
  alert,
  networkIdentity,
  centralMessagePush
}) {
  const [messages,setMessages] = useState([]);
  const [text,setText] = useState('');
  const [loading,setLoading] = useState(true);
  const [sending,setSending] = useState(false);
  const [error,setError] = useState('');
  const threadRef = useRef(null);
  const stickRef = useRef(true);

  const alertId = alert?.id;
  const active = Boolean(alert?.active);

  function nearBottom() {
    const el = threadRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 90;
  }

  function bottom() {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }

  async function refresh(silent=false) {
    if (!alertId || !networkIdentity) return;

    try {
      const result = await getWallaaCentralMessages(
        networkIdentity,
        alertId
      );

      const next = result?.messages || [];
      const shouldScroll =
        stickRef.current || nearBottom() || messages.length === 0;

      setMessages(next);

      if (!silent) setError('');

      if (shouldScroll) {
        requestAnimationFrame(bottom);
      }
    } catch (e) {
      if (!silent) setError(e?.message || 'Chat Centrale non disponibile.');
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    let alive = true;

    (async () => {
      if (alive) await refresh(false);
    })();

    const timer = window.setInterval(() => {
      if (alive && document.visibilityState === 'visible') {
        refresh(true);
      }
    }, 1200);

    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [
    alertId,
    networkIdentity?.installationId,
    networkIdentity?.authToken
  ]);

  useEffect(() => {
    if (
      centralMessagePush?.alertId &&
      String(centralMessagePush.alertId) === String(alertId)
    ) {
      stickRef.current = true;
      refresh(true);
    }
  }, [centralMessagePush?.receivedAt]);

  async function send(e) {
    e.preventDefault();

    const body = text.trim();
    if (!body || !active || sending) return;

    setSending(true);
    setError('');
    stickRef.current = true;

    try {
      await sendWallaaCentralMessage(
        networkIdentity,
        alertId,
        body
      );

      setText('');
      await refresh(true);
      requestAnimationFrame(bottom);
    } catch (e) {
      setError(e?.message || 'Invio non riuscito.');
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="wallaa-central-sos">
      <div className="wallaa-central-sos-head">
        <div>
          <span className="wallaa-central-sos-kicker">
            CENTRALE WALLAA
          </span>
          <strong>Assistenza durante il tuo SOS</strong>
          <p>
            {active
              ? 'Comunica direttamente con la Centrale Wallaa.'
              : 'Conversazione conclusa.'}
          </p>
        </div>

        <span className={`wallaa-central-sos-status ${active ? 'active' : ''}`}>
          {active ? 'ATTIVA' : 'CHIUSA'}
        </span>
      </div>

      <div
        className="wallaa-central-sos-thread"
        ref={threadRef}
        onScroll={() => {
          stickRef.current = nearBottom();
        }}
      >
        {loading ? (
          <div className="wallaa-central-empty">
            Caricamento messaggi…
          </div>
        ) : messages.length ? (
          messages.map((message) => {
            const central = message?.senderAdmin === true;

            return (
              <div
                key={message.id}
                className={`wallaa-central-row ${central ? 'central' : 'me'}`}
              >
                <div className="wallaa-central-bubble">
                  <b>
                    {central
                      ? 'Centrale Wallaa'
                      : 'Tu'}
                  </b>

                  <span>{message.body}</span>

                  <time>
                    {message.createdAt
                      ? new Date(message.createdAt).toLocaleTimeString(
                          'it-IT',
                          { hour:'2-digit', minute:'2-digit' }
                        )
                      : ''}
                  </time>
                </div>
              </div>
            );
          })
        ) : (
          <div className="wallaa-central-empty">
            <strong>Centrale Wallaa</strong>
            <span>
              {active
                ? 'Puoi scrivere qui durante la richiesta di soccorso.'
                : 'Nessun messaggio per questo SOS.'}
            </span>
          </div>
        )}
      </div>

      {error && (
        <div className="wallaa-central-error">
          {error}
        </div>
      )}

      {active && (
        <form
          className="wallaa-central-composer"
          onSubmit={send}
        >
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Scrivi alla Centrale Wallaa…"
            maxLength={4000}
            rows={2}
            disabled={sending}
            onFocus={() => {
              stickRef.current = true;
            }}
          />

          <button
            type="submit"
            disabled={sending || !text.trim()}
          >
            {sending ? 'Invio…' : 'Invia'}
          </button>
        </form>
      )}
    </section>
  );
}
