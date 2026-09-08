import { isRouteErrorResponse, useRouteError } from 'react-router-dom';
import { StatusState } from '../shared/ui/StatusState';

export function RouteErrorPage() {
  const error = useRouteError();
  const title = isRouteErrorResponse(error) ? `Ошибка ${error.status}` : 'Что-то пошло не так';

  return (
    <StatusState
      illustration="error"
      title={title}
      description="Не удалось отобразить страницу. Обновите её или вернитесь к списку переговорных."
      actionLabel="Обновить страницу"
      onAction={() => window.location.reload()}
    />
  );
}
