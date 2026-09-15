import {
  BellRing,
  CheckCircle2,
  Link2,
  MapPin,
  ShieldCheck,
  Trash2,
  TriangleAlert
} from 'lucide-react';

import { activityTitle, formatDateTime, triggerLabel } from '../utils/format';

function ActivityIcon({ entry }) {
  if (entry?.status === 'error') return <TriangleAlert size={18}/>;
  if (entry?.type === 'button' || entry?.type === 'device') return <Link2 size={18}/>;
  if (entry?.type === 'alert' || entry?.type === 'network-alert') return <BellRing size={18}/>;
  return <CheckCircle2 size={18}/>;
}

export default function ActivityScreen({
  activities = [],
  onClear,
  t,
  language
}) {
  const rows = [...activities].sort(
    (a, b) => new Date(b.at || 0) - new Date(a.at || 0)
  );

  const alertCount = rows.filter(
    (x) => x.type === 'alert' || x.type === 'network-alert'
  ).length;

  const successCount = rows.filter(
    (x) =>
      x.status === 'success' ||
      (x.type === 'trigger' && x.status === 'working')
  ).length;

  const handleClear = (event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    onClear?.();
  };

  return (
    <div className="aa-notifications-screen aa-activity-screen-v39">

      <header className="aa-activity-head-v39">
        <div className="aa-activity-head-symbol">
          <ShieldCheck/>
        </div>

        <div className="aa-notifications-titleblock">
          <span>WALLAA CENTER</span>
          <h1>Attività</h1>
          <p>Eventi, SOS e attività di sicurezza degli ultimi 30 giorni.</p>
        </div>

        <div
          className="aa-activity-count-v39"
          aria-label={`${rows.length} attività`}
        >
          <BellRing/>
          <b>{rows.length}</b>
        </div>
      </header>

      <section className="aa-activity-metrics-v39">
        <div>
          <i><BellRing/></i>
          <span>
            <small>ALERT TOTALI</small>
            <strong>{alertCount}</strong>
          </span>
        </div>

        <div>
          <i><ShieldCheck/></i>
          <span>
            <small>EVENTI RIUSCITI</small>
            <strong>{successCount}</strong>
          </span>
        </div>
      </section>

      <section className="aa-notifications-tools aa-notifications-tools-v38 aa-activity-tools-v39">
        <div className="aa-notifications-tool-copy">
          <ShieldCheck/>
          <span>
            <strong>Cronologia attività</strong>
            <small>Conservazione automatica · 30 giorni</small>
          </span>
        </div>

        <button
          type="button"
          onClick={handleClear}
          disabled={!rows.length}
        >
          <Trash2/>
          <span>Cancella tutto</span>
        </button>
      </section>

      <section className="aa-notifications-feed aa-notifications-feed-v38 aa-activity-feed-v39">
        {rows.map((entry) => {
          const visualStatus =
            entry.type === 'trigger' && entry.status === 'working'
              ? 'success'
              : entry.status;

          const title = activityTitle(entry, language);

          const emergency =
            entry.type === 'alert' ||
            entry.type === 'network-alert';

          return (
            <article
              className={`aa-notification-row aa-activity-row-v39 ${emergency ? 'emergency' : ''} ${visualStatus || ''}`}
              key={entry.id}
            >
              <i>
                <ActivityIcon entry={{ ...entry, status: visualStatus }}/>
              </i>

              <div className="aa-notification-copy">
                <strong>{title}</strong>

                <small>
                  {entry.detail ||
                    (entry.trigger
                      ? triggerLabel(entry.trigger, language)
                      : emergency
                        ? 'Aggiornamento sicurezza Wallaa'
                        : 'Evento Wallaa')}
                </small>

                {entry.location?.mapsUrl && (
                  <a
                    href={entry.location.mapsUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <MapPin size={13}/>
                    Apri posizione
                  </a>
                )}
              </div>

              <time>{formatDateTime(entry.at, language)}</time>
            </article>
          );
        })}

        {!rows.length && (
          <div className="aa-notifications-empty">
            <BellRing/>
            <h2>Nessuna attività</h2>
            <p>
              Gli eventi del Wallaa Button, gli SOS e gli aggiornamenti
              di sicurezza compariranno qui.
            </p>
          </div>
        )}
      </section>

    </div>
  );
}
