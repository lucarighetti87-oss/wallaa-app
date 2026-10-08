import {uiText,uiLocale} from '../uiText.js';
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
  const requestRef = useRef(0);
  const [serverActive,setServerActive] = useState(null);
  const [syncError,setSyncError] = useState('');
  const stickRef = useRef(true);

  const alertId = alert?.id;
  const active = Boolean(alert?.active) && serverActive !== false;

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

    const request=++requestRef.current;
    try {
      const result = await getWallaaCentralMessages(
        networkIdentity,
        alertId
      );

      if(request!==requestRef.current)return;
      setSyncError('');
      if(result?.alert)setServerActive(result.alert.status==='active');
      else if(result?.conversation?.closed)setServerActive(false);
      const next = result?.messages || [];
      const shouldScroll =
        stickRef.current || nearBottom() || messages.length === 0;

      setMessages(next);

      if (!silent) setError('');

      if (shouldScroll) {
        requestAnimationFrame(bottom);
      }
    } catch (e) {
      if(request!==requestRef.current)return;
      setSyncError(uiText("Aggiornamento non disponibile. Riproviamo automaticamente."));
      if (!silent) setError(e?.message || uiText("Chat Centrale non disponibile."));
    } finally {
      if (request===requestRef.current) setLoading(false);
    }
  }

  useEffect(() => {
    let alive = true;setMessages([]);setText('');setServerActive(null);setLoading(true);

    (async () => {
      if (alive) await refresh(false);
    })();

    const timer = window.setInterval(() => {
      if (alive && document.visibilityState === 'visible') {
        refresh(true);
      }
    }, 3000);

    return () => {
      alive = false;requestRef.current++;
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
      const result=await sendWallaaCentralMessage(
        networkIdentity,
        alertId,
        body
      );

      requestRef.current++;
      if(result?.message)setMessages(items=>items.some(m=>m.id===result.message.id)?items:[...items,result.message]);
      setText('');
      await refresh(true);
      requestAnimationFrame(bottom);
    } catch (e) {
      setError(e?.message || uiText("Invio non riuscito."));
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="wallaa-central-sos">
      <div className="wallaa-central-sos-head">
        <div>
          <span className="wallaa-central-sos-kicker">{"" + uiText("CENTRALE WALLAA") + " "}</span>
          <strong>{"" + uiText("Chat con la Centrale") + ""}</strong>
          <p>
            {active
              ? uiText("Questo canale collega te e la Centrale durante il SOS.")
              : uiText("Conversazione conclusa.")}
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
          <div className="wallaa-central-empty">{"" + uiText("Caricamento messaggi…") + " "}</div>
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
                      ? uiText("Centrale Wallaa")
                      : uiText("Tu")}
                  </b>

                  <span>{message.body}</span>

                  <time>
                    {message.createdAt
                      ? new Date(message.createdAt).toLocaleTimeString(
                          'it-IT',
                          { hour:'2-digit', minute:'2-digit' }
                        )
                      : ''}{!central?uiText(" · Inviato"):''}
                  </time>
                </div>
              </div>
            );
          })
        ) : (
          <div className="wallaa-central-empty">
            <strong>{"" + uiText("Centrale Wallaa") + ""}</strong>
            <span>
              {active
                ? uiText("Puoi scrivere qui durante la richiesta di soccorso.")
                : uiText("Nessun messaggio per questo SOS.")}
            </span>
          </div>
        )}
      </div>

      {syncError && <div className="wallaa-chat-sync" role="status">{syncError}</div>}
      {error && (
        <div className="wallaa-central-error" role="alert">
          {error}
        </div>
      )}

      {!active && <p className="wallaa-chat-sync">{"" + uiText("SOS concluso · puoi leggere i messaggi, ma non inviarne altri.") + ""}</p>}
      {active && (
        <form
          className="wallaa-central-composer"
          onSubmit={send}
        >
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={uiText("Scrivi alla Centrale Wallaa…")}
            maxLength={4000}
            aria-label={uiText("Messaggio alla Centrale")}
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
            {sending ? uiText("Invio…") : uiText("Invia")}
          </button>
        </form>
      )}
      {active && <small className="wallaa-chat-delivery-note">{"" + uiText("Inviato indica un messaggio salvato; non conferma che sia già stato letto.") + ""}</small>}
    </section>
  );
}
