import { Link } from 'react-router-dom';
import { useLang } from '../context/LangContext';

export default function CaseCard({ item }) {
  const { t } = useLang();
  const img = item.images?.[0] || 'https://placehold.co/300x240?text=No+Photo';

  const statusLabel = {
    active: t('card.status_active'),
    found: t('card.status_found'),
    closed: t('card.status_closed'),
    pending: t('card.status_pending'),
    verified: t('card.status_verified'),
  }[item.status] || item.status;

  return (
    <div className="case-card">
      <img src={img} alt={item.name} />
      <div className="case-body">
        <div className="row between" style={{ marginBottom: 8 }}>
          <h3 style={{ margin: 0 }}>{item.name}</h3>
          <span className={`badge ${item.status}`}>{statusLabel}</span>
        </div>
        <p>{t('card.age')}: {item.age || t('card.unknown')}</p>
        <p>{t('card.last_seen')}: {item.last_seen_location}</p>
        <div className="row gap" style={{ marginTop: 14 }}>
          <Link
            className="btn"
            to={`/cases/${item.id}`}
            style={{ flex: 1, textAlign: 'center', background: 'var(--green)', fontSize: 13, padding: '8px 12px' }}
          >
            {t('card.view_details')}
          </Link>
          <Link
            className="btn outline"
            to={`/sighting/${item.id}`}
            style={{ flex: 1, textAlign: 'center', fontSize: 13, padding: '8px 12px' }}
          >
            {t('card.i_saw')}
          </Link>
        </div>
      </div>
    </div>
  );
}
