import {uiText,uiLocale} from '../uiText.js';
import { useEffect, useRef, useState } from 'react';
import {createPortal} from 'react-dom';
import {
  ArrowLeft,
  Check,
  LockKeyhole,
  MessageCircle,
  Send,
  ShieldCheck,
  Trash2,
  UserRound
} from 'lucide-react';

import {
  getWallaaConversationMessages,
  sendWallaaMessage,
  setWallaaChatBlocked,
  reportWallaaChat,
  deleteWallaaConversation
} from '../services/network';

export default function ChatScreen({
  conversation,
  networkIdentity,
  messagePush,
  onBack,
  onDeleted
}) {
  const [messages, setMessages] = useState([]);
  const [conversationMeta, setConversationMeta] = useState(() => ({
    conversationType: conversation?.conversationType || 'direct',
    sentinelIncidentId: conversation?.sentinelIncidentId || null,
    closedAt: conversation?.closedAt || null,
    closed: Boolean(conversation?.closed)
  }));
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const threadRef = useRef(null);
  const shouldStickToBottomRef = useRef(true);
  const lastMessageIdRef = useRef(null);
  const requestRef = useRef(0);
  const [syncError,setSyncError] = useState('');
  const [safetyOpen,setSafetyOpen]=useState(false);
  const [reportReason,setReportReason]=useState('');
  const [reportMessageId,setReportMessageId]=useState(null);
  const [safetyBusy,setSafetyBusy]=useState(false);
  const [safetyNotice,setSafetyNotice]=useState('');
  useEffect(()=>{
    if(!safetyOpen)return;
    const close=event=>{if(event.key==='Escape'&&!safetyBusy)setSafetyOpen(false);};
    document.addEventListener('keydown',close);
    return()=>document.removeEventListener('keydown',close);
  },[safetyOpen,safetyBusy]);
  const chatBlocked=conversationMeta?.safety?.canSend===false;
  const blockedByMe=Boolean(conversationMeta?.safety?.blockedByMe);
  const safetyAction=async(action)=>{
    if(safetyBusy)return;
    setSafetyBusy(true);setSafetyNotice('');
    try{
      if(action==='block'){
        const result=await setWallaaChatBlocked(networkIdentity,current.id,!blockedByMe);
        setConversationMeta(previous=>({...previous,safety:result.safety}));
        setSafetyNotice(uiText(result.safety.blockedByMe?'Utente bloccato nella chat.':'Utente sbloccato nella chat.'));
      }else{
        await reportWallaaChat(networkIdentity,current.id,reportReason.trim(),reportMessageId);
        setReportReason('');setReportMessageId(null);setSafetyNotice(uiText('Segnalazione ricevuta dalla Centrale Wallaa.'));
      }
    }catch(e){setSafetyNotice(e.message||uiText('Operazione non riuscita.'));}
    finally{setSafetyBusy(false);}
  };

  const isThreadNearBottom = () => {
    const thread = threadRef.current;
    if (!thread) return true;
    return (
      thread.scrollHeight -
      thread.scrollTop -
      thread.clientHeight
    ) < 90;
  };

  const scrollThreadToBottom = () => {
    const thread = threadRef.current;
    if (!thread) return;
    thread.scrollTop = thread.scrollHeight;
  };

  const current = conversation || {};

  const loadMessages = async ({ silent = false } = {}) => {
    if (!current.id || !networkIdentity?.authToken) return;

    const request = ++requestRef.current;
    try {
      if (!silent) setLoading(true);
      if (!silent) setError('');

      const result = await getWallaaConversationMessages(
        networkIdentity,
        current.id
      );

      if (request !== requestRef.current) return;
      setSyncError('');
      setMessages(Array.isArray(result?.messages) ? result.messages : []);

      if (result?.conversation) {
        setConversationMeta((previous) => ({
          ...previous,
          ...result.conversation,
          closed: Boolean(
            result.conversation.closed ||
            result.conversation.closedAt
          )
        }));
      }
    } catch (e) {
      if (request !== requestRef.current) return;
      setSyncError(uiText("Aggiornamento non disponibile. Riproviamo automaticamente."));
      if (!silent) {
        setError(e?.message || uiText("Impossibile caricare i messaggi."));
      }
    } finally {
      if (request === requestRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);setMessages([]);setBody('');setError('');setSafetyOpen(false);setSafetyNotice('');setReportMessageId(null);setReportReason('');
    loadMessages();
    return () => { requestRef.current++; };
  }, [current.id, networkIdentity?.authToken]);

  useEffect(() => {
    if (!current.id || !networkIdentity?.authToken) return undefined;

    const refresh = () => {
      if(document.visibilityState==='visible') loadMessages({ silent: true });
    };

    const timer = window.setInterval(refresh, 3000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') refresh();
    };

    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [current.id, networkIdentity?.authToken]);

  useEffect(() => {
    if (
      !messagePush?.conversationId ||
      String(messagePush.conversationId) !== String(current.id)
    ) {
      return;
    }

    loadMessages({ silent: true });
  }, [messagePush?.receivedAt, messagePush?.conversationId, current.id]);

  useEffect(() => {
    const latest = messages[messages.length - 1];
    const latestId = latest?.id ?? null;
    const changed =
      latestId !== null &&
      latestId !== lastMessageIdRef.current;

    if (shouldStickToBottomRef.current || messages.length <= 1) {
      window.requestAnimationFrame(() => {
        scrollThreadToBottom();
      });
    }

    if (changed) {
      lastMessageIdRef.current = latestId;
    }
  }, [messages]);

  useEffect(() => {
    const thread = threadRef.current;
    if (!thread) return undefined;

    const onThreadScroll = () => {
      shouldStickToBottomRef.current = isThreadNearBottom();
    };

    thread.addEventListener(
      'scroll',
      onThreadScroll,
      { passive: true }
    );

    return () => {
      thread.removeEventListener(
        'scroll',
        onThreadScroll
      );
    };
  }, [current.id]);

  const handleSend = async () => {
    const value = body.trim();

    if (!value || !current.id || sending || sentinelClosed || chatBlocked) return;

    try {
      shouldStickToBottomRef.current = true;
      setSending(true);
      setError('');

      const result = await sendWallaaMessage(
        networkIdentity,
        current.id,
        value
      );

      const message = result?.message;

      if (message) {
        requestRef.current++;
        setMessages((items) => items.some(item=>item.id===message.id)?items:[...items, message]);
      } else {
        await loadMessages();
      }

      setBody('');
      loadMessages({silent:true});
    } catch (e) {
      setError(e?.message || uiText("Invio del messaggio non riuscito."));
    } finally {
      setSending(false);
    }
  };

  const isSentinelConversation =
    conversationMeta?.conversationType === 'sentinel' ||
    current?.conversationType === 'sentinel';

  const sentinelClosed = Boolean(
    isSentinelConversation &&
    (
      conversationMeta?.closed ||
      conversationMeta?.closedAt ||
      current?.closed ||
      current?.closedAt
    )
  );

  const handleDelete = async () => {
    if (!current.id || isSentinelConversation) return;

    const confirmed = window.confirm(
      uiText("Eliminare definitivamente questa conversazione?")
    );

    if (!confirmed) return;

    try {
      setError('');
      await deleteWallaaConversation(networkIdentity, current.id);
      onDeleted?.();
      onBack();
    } catch (e) {
      setError(e?.message || uiText("Impossibile eliminare la conversazione."));
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent?.isComposing) {
      event.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={`wallaa-chat-screen ${isSentinelConversation ? 'wallaa-chat-sentinel' : ''}`}>
      <header className="wallaa-chat-header">
        <button type="button" onClick={onBack} aria-label={uiText("Indietro")}>
          <ArrowLeft size={22} />
        </button>

        <div className="wallaa-chat-avatar">
          <UserRound size={18} />
        </div>

        <div className="wallaa-chat-person">
          <strong>
            {current.name || current.title || uiText("Utente Wallaa")}
          </strong>
          <span>
            <LockKeyhole size={10} />
            {isSentinelConversation ? uiText("Chat di soccorso · Sentinel") : uiText("Conversazione Wallaa")}
          </span>
        </div>

        <button type="button" onClick={()=>{setSafetyOpen(true);setSafetyNotice('');setReportMessageId(null);}} aria-label={uiText("Sicurezza della chat")}><ShieldCheck size={18}/></button>
        {!isSentinelConversation && (
          <button
            type="button"
            className="wallaa-chat-delete"
            onClick={handleDelete}
            aria-label={uiText("Elimina conversazione")}
          >
            <Trash2 size={18} />
          </button>
        )}
      </header>

      {isSentinelConversation && <div className="wallaa-chat-context"><ShieldCheck size={18}/><span><strong>{sentinelClosed?uiText("Intervento concluso"):uiText("Intervento Sentinel")}</strong><small>{"" + uiText("Parli con") + " "}{current.name || current.title || 'la persona assegnata'}{"" + uiText(". Questa chat è separata dalla Centrale.") + ""}</small></span></div>}
      {chatBlocked && <div className="wallaa-chat-sync" role="status">{uiText("Invio sospeso: blocco della chat attivo.")}</div>}
      {syncError && <div className="wallaa-chat-sync" role="status">{syncError}</div>}
      {error && (
        <div className="wallaa-message-error wallaa-chat-error" role="alert">
          {error}
        </div>
      )}

      <main
        ref={threadRef}
        className="wallaa-chat-thread"
      >
        {loading ? (
          <div className="wallaa-chat-thread-empty">
            <div className="wallaa-empty-chat-icon">
              <MessageCircle size={27} />
            </div>
            <strong>{"" + uiText("Caricamento...") + ""}</strong>
          </div>
        ) : messages.length === 0 ? (
          <div className="wallaa-chat-thread-empty">
            <div className="wallaa-empty-chat-icon">
              <MessageCircle size={27} />
            </div>
            <strong>{"" + uiText("Nessun messaggio") + ""}</strong>
            <p>
              {isSentinelConversation
                ? uiText("Canale operativo dell’intervento Sentinel.")
                : uiText("Inizia la conversazione.")}
            </p>
          </div>
        ) : (
          messages.map((message) => {
            const mine =
              message.senderUserId === networkIdentity?.userId ||
              message.sender_user_id === networkIdentity?.userId;

            return (
              <div
                key={message.id}
                className={`wallaa-chat-message ${mine ? 'mine' : 'theirs'}`}
              >
                <b className="wallaa-chat-sender">{mine?uiText("Tu"):current.name || current.title || uiText("Utente Wallaa")}</b>
                <p>{message.body}</p>
                {!mine && <button type="button" className="wallaa-chat-report-message" onClick={()=>{setReportMessageId(message.id);setSafetyOpen(true);setSafetyNotice('');}} aria-label={uiText("Segnala messaggio")}>{uiText("Segnala")}</button>}
                <span>
                  {message.createdAt
                    ? new Date(message.createdAt).toLocaleTimeString(uiLocale(), {
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    : ''}
                  {mine && <><Check size={12} />{" " + uiText("Inviato") + ""}</>}
                </span>
              </div>
            );
          })
        )}
      </main>

      {sentinelClosed ? (
        <footer className="wallaa-chat-composer wallaa-chat-readonly">
          <div className="wallaa-sentinel-chat-closed">
            <ShieldCheck size={18} />
            <span>
              <strong>{"" + uiText("Intervento concluso") + ""}</strong>
              <small>{"" + uiText("La conversazione Sentinel è disponibile in sola lettura.") + " "}</small>
            </span>
          </div>
        </footer>
      ) : (
      <footer className="wallaa-chat-composer">
        <div>
          <textarea
            rows="2"
            maxLength={4000}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              shouldStickToBottomRef.current = true;
              window.setTimeout(() => {
                scrollThreadToBottom();
              }, 80);
            }}
            placeholder={isSentinelConversation?uiText("Scrivi nella chat di soccorso…"):uiText("Scrivi un messaggio…")}
            aria-label={uiText("Messaggio")}
            disabled={sending || chatBlocked}
          />

          <button
            type="button"
            aria-label={uiText("Invia messaggio")}
            onClick={handleSend}
            disabled={!body.trim() || sending || chatBlocked}
          >
            {sending?uiText("Invio…"):<Send size={18} />}
          </button>
        </div>

        <small>
          <LockKeyhole size={9} />
          {sending?uiText("Invio in corso…"):uiText("Inviato = salvato nella conversazione; non indica lettura.")}
        </small>
      </footer>
      )}
      {safetyOpen && createPortal(<div className="wallaa-chat-safety-overlay" onClick={event=>{if(event.target===event.currentTarget&&!safetyBusy)setSafetyOpen(false);}}>
        <section role="dialog" aria-modal="true" aria-label={uiText("Sicurezza della chat")} className="wallaa-chat-safety-panel">
          <header><h2>{uiText("Sicurezza della chat")}</h2><button type="button" disabled={safetyBusy} onClick={()=>setSafetyOpen(false)} aria-label={uiText("Chiudi")}>×</button></header>
          <p>{uiText("Blocca i messaggi o segnala un comportamento scorretto. Il blocco riguarda la chat: non modifica i tuoi Guardian o un SOS attivo.")}</p>
          <button type="button" disabled={safetyBusy} onClick={()=>safetyAction('block')}>{uiText(blockedByMe?"Sblocca utente":"Blocca utente")}</button>
          <label>{uiText(reportMessageId?"Segnala questo messaggio":"Segnala utente")}<textarea autoFocus maxLength={1000} value={reportReason} onChange={event=>setReportReason(event.target.value)} placeholder={uiText("Descrivi cosa è successo")} disabled={safetyBusy}/></label>
          <button type="button" disabled={safetyBusy||!reportReason.trim()} onClick={()=>safetyAction('report')}>{uiText("Invia segnalazione")}</button>
          {safetyNotice&&<p role="status">{safetyNotice}</p>}
          <a href="mailto:safety@wallaasafety.com">safety@wallaasafety.com</a>
        </section>
      </div>,document.body)}
    </div>
  );
}
