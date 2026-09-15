import { useEffect, useState } from 'react';
import {
  LockKeyhole,
  MessageCircle,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UserRound,
  X
} from 'lucide-react';

import {
  getWallaaMessageUsers,
  getWallaaConversations,
  createWallaaConversation,
  deleteWallaaConversation
} from '../services/network';

function formatConversationTime(value) {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const now = new Date();

  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  const messageDay = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );

  const diffDays = Math.round(
    (today.getTime() - messageDay.getTime()) / 86400000
  );

  if (diffDays === 0) {
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  if (diffDays === 1) return 'Ieri';

  return date.toLocaleDateString([], {
    day: '2-digit',
    month: '2-digit',
    year: date.getFullYear() !== now.getFullYear()
      ? '2-digit'
      : undefined
  });
}

export default function MessagesScreen({ networkIdentity, onOpenChat }) {
  const [conversations, setConversations] = useState([]);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const loadConversations = async () => {
    if (!networkIdentity?.authToken) {
      setConversations([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');
      const result = await getWallaaConversations(networkIdentity);
      setConversations(Array.isArray(result?.conversations) ? result.conversations : []);
    } catch (e) {
      setError(e?.message || 'Impossibile caricare le conversazioni.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, [networkIdentity?.authToken]);

  useEffect(() => {
    if (!newChatOpen) return;

    const value = query.trim();

    if (value.length < 2) {
      setUsers([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setSearching(true);
        const result = await getWallaaMessageUsers(networkIdentity, value);
        setUsers(Array.isArray(result?.users) ? result.users : []);
      } catch (e) {
        setUsers([]);
        setError(e?.message || 'Ricerca utenti non disponibile.');
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, newChatOpen, networkIdentity?.authToken]);

  const handleDeleteConversation = async (event, conversation) => {
    event.stopPropagation();

    if (!conversation?.id) return;

    const confirmed = window.confirm(
      `Eliminare definitivamente la conversazione con ${conversation.name || 'questo utente'}?`
    );

    if (!confirmed) return;

    try {
      setError('');
      await deleteWallaaConversation(networkIdentity, conversation.id);
      setConversations((items) =>
        items.filter((item) => item.id !== conversation.id)
      );
    } catch (e) {
      setError(e?.message || 'Impossibile eliminare la conversazione.');
    }
  };

  const openUserConversation = async (user) => {
    if (!user?.userId || creating) return;

    try {
      setCreating(true);
      setError('');

      const result = await createWallaaConversation(networkIdentity, user.userId);
      const conversation = result?.conversation;

      if (!conversation?.id) {
        throw new Error('Conversazione non disponibile.');
      }

      setNewChatOpen(false);
      setQuery('');
      setUsers([]);

      await loadConversations();
      onOpenChat(conversation);
    } catch (e) {
      setError(e?.message || 'Impossibile creare la conversazione.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="v4-generic-screen wallaa-messages-screen">
      <header className="wallaa-messages-heading">
        <div className="v4-screen-heading">
          <span>WALLAA CONNECT</span>
          <h1>Messaggi</h1>
          <p>Conversazioni private con utenti della tua rete Wallaa.</p>
        </div>

        <button
          type="button"
          className="wallaa-new-chat-button"
          onClick={() => setNewChatOpen(true)}
          aria-label="Nuova conversazione"
        >
          <Plus size={22} />
        </button>
      </header>

      {error && (
        <div className="wallaa-message-error" role="alert">
          {error}
        </div>
      )}

      <button
        type="button"
        className="wallaa-message-search"
        onClick={() => setNewChatOpen(true)}
      >
        <Search size={17} />
        <span>Cerca un utente Wallaa</span>
      </button>

      <section className="wallaa-message-security">
        <div className="wallaa-message-security-icon">
          <ShieldCheck size={19} />
        </div>
        <div>
          <strong>Conversazioni private</strong>
          <span>
            Sono visibili soltanto le conversazioni associate al tuo account.
          </span>
        </div>
      </section>

      <div className="wallaa-message-section-title">
        <span>CONVERSAZIONI</span>
        <small>{conversations.length}</small>
      </div>

      {loading ? (
        <section className="wallaa-messages-empty">
          <div><MessageCircle size={29} /></div>
          <strong>Caricamento...</strong>
          <p>Recupero delle tue conversazioni.</p>
        </section>
      ) : conversations.length === 0 ? (
        <section className="wallaa-messages-empty">
          <div><MessageCircle size={29} /></div>
          <strong>Nessuna conversazione</strong>
          <p>Avvia una nuova conversazione con un utente Wallaa.</p>
          <button type="button" onClick={() => setNewChatOpen(true)}>
            <Plus size={17} />
            Nuova conversazione
          </button>
        </section>
      ) : (
        <section className="wallaa-conversation-list">
          {conversations.map((conversation, index) => (
            <div
              className="wallaa-conversation-row"
              key={conversation.id}
              style={{ '--message-index': index }}
            >
              <button
                type="button"
                className="wallaa-conversation wallaa-conversation-main"
                onClick={() => onOpenChat(conversation)}
              >
              <div
                className={`wallaa-conversation-avatar ${
                  conversation.conversationType === 'sentinel'
                    ? 'sentinel'
                    : ''
                }`}
              >
                {conversation.conversationType === 'sentinel'
                  ? <ShieldCheck size={19} />
                  : <UserRound size={19} />}
              </div>

              <div className="wallaa-conversation-copy">
                <div>
                  <strong>
                    {conversation.name || conversation.title || 'Utente Wallaa'}
                  </strong>
                  {conversation.updatedAt && (
                    <time>
                      {formatConversationTime(conversation.updatedAt)}
                    </time>
                  )}
                </div>

                <small>
                  {conversation.conversationType === 'sentinel'
                    ? `Intervento Sentinel · ${
                        conversation.closed ? 'concluso' : 'attivo'
                      }`
                    : 'Contatto Wallaa'}
                </small>

                <div className="wallaa-conversation-preview">
                  <p>
                    {conversation.lastMessage || 'Nessun messaggio'}
                  </p>

                  {Number(conversation.unreadCount || 0) > 0 && (
                    <span
                      className="wallaa-message-unread"
                      aria-label={`${conversation.unreadCount} messaggi non letti`}
                    >
                      {conversation.unreadCount > 99
                        ? '99+'
                        : conversation.unreadCount}
                    </span>
                  )}
                </div>
              </div>
              </button>
              {conversation.conversationType !== 'sentinel' && (
                <button
                  type="button"
                  className="wallaa-conversation-delete"
                  onClick={(event) => handleDeleteConversation(event, conversation)}
                  aria-label={`Elimina conversazione con ${conversation.name || 'utente Wallaa'}`}
                >
                  <Trash2 size={17} />
                </button>
              )}
            </div>
          ))}
        </section>
      )}

      {newChatOpen && (
        <div
          className="wallaa-new-chat-backdrop"
          role="presentation"
          onClick={() => setNewChatOpen(false)}
        >
          <section
            className="wallaa-new-chat-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Nuova conversazione"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="wallaa-new-chat-handle" />

            <header>
              <div>
                <span>WALLAA CONNECT</span>
                <h2>Nuova conversazione</h2>
              </div>

              <button
                type="button"
                onClick={() => setNewChatOpen(false)}
                aria-label="Chiudi"
              >
                <X size={20} />
              </button>
            </header>

            <label className="wallaa-new-chat-search">
              <Search size={18} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Nome, email o numero"
                autoComplete="off"
                autoFocus
              />
            </label>

            <div className="wallaa-new-chat-results">
              {query.trim().length < 2 ? (
                <div className="wallaa-new-chat-placeholder">
                  <LockKeyhole size={22} />
                  <strong>Cerca un utente Wallaa</strong>
                  <p>
                    Inserisci almeno 2 caratteri per cercare un account reale.
                  </p>
                </div>
              ) : searching ? (
                <div className="wallaa-new-chat-placeholder">
                  <Search size={22} />
                  <strong>Ricerca...</strong>
                </div>
              ) : users.length === 0 ? (
                <div className="wallaa-new-chat-placeholder">
                  <UserRound size={22} />
                  <strong>Nessun utente trovato</strong>
                  <p>
                    La ricerca mostra soltanto account Wallaa disponibili.
                  </p>
                </div>
              ) : (
                users.map((user) => (
                  <button
                    type="button"
                    className="wallaa-message-user-result"
                    key={user.userId}
                    disabled={creating}
                    onClick={() => openUserConversation(user)}
                  >
                    <div className="wallaa-conversation-avatar">
                      <UserRound size={19} />
                    </div>

                    <div>
                      <strong>
                        {user.displayName || user.name || 'Utente Wallaa'}
                      </strong>
                      <span>
                        {user.email || user.phone || 'Account Wallaa'}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
