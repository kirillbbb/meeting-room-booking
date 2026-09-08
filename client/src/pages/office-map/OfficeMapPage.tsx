import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useOfficeSelection } from '../../app/office-selection';
import { useOffices } from '../../entities/query/hooks';
import { Icon } from '../../shared/ui/Icon';
import { StatusState } from '../../shared/ui/StatusState';

function FloorPlanPlaceholder() {
  return (
    <svg className="office-plan" viewBox="0 0 1200 600" role="img" aria-label="Эскиз карты офиса">
      <path className="office-plan__shell" d="M80 135 1015 70l105 405-970 70Z" />
      <g className="office-plan__walls">
        <path d="M160 145v390M285 135v390M430 125v390M585 112v392M750 100v390M915 88v390" />
        <path d="m90 285 970-62M115 410l980-65" />
        <path d="M285 285v125M585 223v189M915 345v133" />
      </g>
      <g className="office-plan__rooms">
        <rect x="105" y="168" width="128" height="78" rx="12" />
        <rect x="315" y="150" width="92" height="98" rx="12" />
        <rect x="458" y="140" width="102" height="92" rx="12" />
        <rect x="620" y="125" width="105" height="82" rx="12" />
        <rect x="785" y="110" width="100" height="80" rx="12" />
        <rect x="940" y="104" width="90" height="75" rx="12" />
        <rect x="175" y="325" width="85" height="65" rx="12" />
        <rect x="330" y="315" width="70" height="65" rx="12" />
        <rect x="620" y="280" width="98" height="80" rx="12" />
        <rect x="790" y="270" width="102" height="68" rx="12" />
      </g>
      <g className="office-plan__markers">
        <circle cx="170" cy="206" r="18" />
        <circle cx="361" cy="198" r="18" />
        <circle cx="509" cy="184" r="18" />
        <circle cx="672" cy="165" r="18" />
        <circle cx="835" cy="150" r="18" />
        <circle cx="985" cy="142" r="18" />
      </g>
    </svg>
  );
}

export function OfficeMapPage() {
  const { officeId = '' } = useParams();
  const offices = useOffices();
  const { setSelectedOfficeId } = useOfficeSelection();
  const [selectedFloor, setSelectedFloor] = useState(3);
  const office = offices.data?.find((item) => item.id === officeId);

  useEffect(() => {
    if (office) setSelectedOfficeId(office.id);
  }, [office, setSelectedOfficeId]);

  if (offices.isPending) {
    return (
      <div className="office-map-page office-map-page--loading" aria-label="Загрузка карты офиса" />
    );
  }
  if (offices.isError || !office) {
    return (
      <StatusState
        illustration="error"
        title={offices.isError ? 'Не удалось загрузить офис' : 'Офис не найден'}
        description="Вернитесь к списку переговорных и выберите доступный офис."
        actionLabel="К переговорным"
        onAction={() => {
          window.location.href = '/rooms';
        }}
      />
    );
  }

  return (
    <section className="office-map-page">
      <header className="office-map-header">
        <div>
          <Link to="/rooms" className="office-map-back">
            <Icon name="chevron-right" size={16} />
            Переговорные
          </Link>
          <h1>Карта офиса</h1>
          <p>
            {office.name} · {office.address}
          </p>
        </div>
        <div className="floor-switch" aria-label="Этаж">
          {[4, 3, 2].map((floor) => (
            <button
              key={floor}
              type="button"
              className={floor === selectedFloor ? 'is-active' : ''}
              aria-pressed={floor === selectedFloor}
              onClick={() => setSelectedFloor(floor)}
            >
              {floor}
            </button>
          ))}
        </div>
      </header>
      <section className="office-map-stage">
        <div className="office-map-stage__art" aria-hidden="true" data-floor={selectedFloor}>
          <FloorPlanPlaceholder />
        </div>
        <div className="office-map-teaser">
          <span className="office-map-teaser__eyebrow">Концепт следующей версии</span>
          <span className="office-map-teaser__icon">
            <Icon name="home" size={30} />
          </span>
          <h2>Переговорная прямо на плане офиса</h2>
          <p>
            Здесь можно будет увидеть свободные комнаты рядом, проверить их расписание и
            забронировать подходящую — без поиска по списку.
          </p>
          <strong>Чтобы разблокировать эту функцию, пригласите меня в команду 😉</strong>
          <div>
            <Link className="button button--primary" to="/rooms?view=schedule">
              Открыть расписание
            </Link>
            <Link className="button button--secondary" to="/rooms">
              Вернуться к переговорным
            </Link>
          </div>
        </div>
      </section>
      <p className="office-map-caption">
        Демо-концепт: план не содержит данных реального офиса и создан специально для тестового
        задания.
      </p>
    </section>
  );
}
