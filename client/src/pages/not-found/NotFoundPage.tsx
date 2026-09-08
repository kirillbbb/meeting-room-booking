import { Link } from 'react-router-dom';
import { Icon } from '../../shared/ui/Icon';

export function NotFoundPage() {
  return (
    <section className="not-found">
      <div>
        <strong>404</strong>
        <h1>Страница не найдена</h1>
        <p>Запрашиваемая страница не существует, была удалена или перенесена на другой адрес.</p>
      </div>
      <Link className="button button--primary" to="/rooms">
        <Icon name="home" size={18} />
        Вернуться к переговорным
      </Link>
    </section>
  );
}
