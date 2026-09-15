import { useEffect, useRef, useState } from 'react';
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

  const current = conversation || {};

  const loadMessages = async ({ silent = false } = {}) => {
    if (!current.id || !networkIdentity?.authToken) return;

    try {
      if (!silent) setLoading(true);
      setError('');

      const result = await getWallaaConversationMessages(
        networkIdentity,
        current.id
      );

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
      if (!silent) {
        setError(e?.message || 'Impossibile caricare i messaggi.');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
  }, [current.id, networkIdentity?.authToken]);

  useEffect(() => {
    if (!current.id || !networkIdentity?.authToken) return undefined;

    const refresh = () => {
      loadMessages({ silent: true });
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
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const keepLatestMessageVisible = () => {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          if (threadRef.current) {
            threadRef.current.scrollTop = threadRef.current.scrollHeight;
          }
        });
      });
    };

    const viewport = window.visualViewport;

    if (viewport) {
      viewport.addEventListener('resize', keepLatestMessageVisible);
      viewport.addEventListener('scroll', keepLatestMessageVisible);
    }

    window.addEventListener('resize', keepLatestMessageVisible);

    return () => {
      if (viewport) {
        viewport.removeEventListener('resize', keepLatestMessageVisible);
        viewport.removeEventListener('scroll', keepLatestMessageVisible);
      }

      window.removeEventListener('resize', keepLatestMessageVisible);
    };
  }, []);

  const handleSend = async () => {
    const value = body.trim();

    if (!value || !current.id || sending) return;

    try {
      setSending(true);
      setError('');

      const result = await sendWallaaMessage(
        networkIdentity,
        current.id,
        value
      );

      const message = result?.message;

      if (message) {
        setMessages((items) => [...items, message]);
      } else {
        await loadMessages();
      }

      setBody('');
    } catch (e) {
      setError(e?.message || 'Invio del messaggio non riuscito.');
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
      'Eliminare definitivamente questa conversazione?'
    );

    if (!confirmed) return;

    try {
      setError('');
      await deleteWallaaConversation(networkIdentity, current.id);
      onDeleted?.();
      onBack();
    } catch (e) {
      setError(e?.message || 'Impossibile eliminare la conversazione.');
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={`wallaa-chat-screen ${isSentinelConversation ? 'wallaa-chat-sentinel' : ''}`}>
      <header className="wallaa-chat-header">
        <button type="button" onClick={onBack} aria-label="Indietro">
          <ArrowLeft size={22} />
        </button>

        <div className="wallaa-chat-avatar">
          <UserRound size={18} />
        </div>

        <div className="wallaa-chat-person">
          <strong>
            {current.name || current.title || 'Utente Wallaa'}
          </strong>
          <span>
            <LockKeyhole size={10} />
            {current.role || 'Wallaa'}
          </span>
        </div>

        {!isSentinelConversation && (
          <button
            type="button"
            className="wallaa-chat-delete"
            onClick={handleDelete}
            aria-label="Elimina conversazione"
          >
            <Trash2 size={18} />
          </button>
        )}
      </header>

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
            <strong>Caricamento...</strong>
          </div>
        ) : messages.length === 0 ? (
          <div className="wallaa-chat-thread-empty">
            <div className="wallaa-empty-chat-icon">
              <MessageCircle size={27} />
            </div>
            <strong>Nessun messaggio</strong>
            <p>
              {isSentinelConversation
                ? 'Canale operativo dell’intervento Sentinel.'
                : 'Inizia la conversazione.'}
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
                <p>{message.body}</p>
                <span>
                  {message.createdAt
                    ? new Date(message.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    : ''}
                  {mine && <Check size={12} />}
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
              <strong>Intervento concluso</strong>
              <small>
                La conversazione Sentinel è disponibile in sola lettura.
              </small>
            </span>
          </div>
        </footer>
      ) : (
      <footer className="wallaa-chat-composer">
        <div>
          <textarea
            rows="1"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              window.setTimeout(() => {
                if (threadRef.current) {
                  threadRef.current.scrollTop = threadRef.current.scrollHeight;
                }
              }, 120);
            }}
            placeholder="Scrivi un messaggio..."
            aria-label="Messaggio"
            disabled={sending}
          />

          <button
            type="button"
            aria-label="Invia messaggio"
            onClick={handleSend}
            disabled={!body.trim() || sending}
          >
            <Send size={18} />
          </button>
        </div>

        <small>
          <LockKeyhole size={9} />
          Comunicazione privata Wallaa
        </small>
      </footer>
      )}
    </div>
  );
}
