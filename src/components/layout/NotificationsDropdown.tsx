import { Bell, ClipboardList, AlertTriangle, Calculator, Database, TrendingDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotifications, useDismissAlert, Notification } from '@/hooks/useNotifications';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const notificationIcons = {
  assessment_created: ClipboardList,
  assessment_calculated: Calculator,
  data_imported: Database,
  issue_detected: AlertTriangle,
  regression_alert: TrendingDown,
};

const notificationColors = {
  assessment_created: 'text-primary',
  assessment_calculated: 'text-severity-good',
  data_imported: 'text-accent',
  issue_detected: 'text-severity-critical',
  regression_alert: 'text-severity-critical',
};

export function NotificationsDropdown() {
  const { data: notifications = [], isLoading } = useNotifications();
  const dismissAlert = useDismissAlert();
  const navigate = useNavigate();

  const unreadCount = notifications.filter(n => !n.read).length;
  const regressionAlerts = notifications.filter(n => n.type === 'regression_alert');

  const handleNotificationClick = (notification: Notification) => {
    if (notification.entityId) {
      if (notification.type === 'regression_alert') {
        navigate(`/destinos`);
      } else if (notification.type === 'issue_detected' || notification.type === 'assessment_calculated' || notification.type === 'assessment_created') {
        navigate(`/diagnosticos/${notification.entityId}`);
      }
    }
  };

  const handleDismissAlert = (e: React.MouseEvent, alertId: string) => {
    e.stopPropagation();
    dismissAlert.mutate(alertId);
  };

  const formatTime = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { 
        addSuffix: true, 
        locale: ptBR 
      });
    } catch {
      return '';
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-severity-critical text-[10px] font-bold text-white flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notificações</span>
          {unreadCount > 0 && (
            <span className="text-xs text-muted-foreground">{unreadCount} novas</span>
          )}
        </DropdownMenuLabel>
        
        {/* Regression Alerts Section */}
        {regressionAlerts.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5">
              <span className="text-xs font-semibold text-severity-critical flex items-center gap-1">
                <TrendingDown className="h-3 w-3" />
                Alertas de Regressão
              </span>
            </div>
            {regressionAlerts.map((notification) => (
              <div
                key={notification.id}
                className="flex items-start gap-3 p-3 mx-1 mb-1 rounded-md bg-severity-critical/10 border border-severity-critical/20 cursor-pointer hover:bg-severity-critical/15 transition-colors"
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="mt-0.5 text-severity-critical">
                  <TrendingDown className="h-4 w-4" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium leading-none text-severity-critical">
                      {notification.title}
                    </p>
                    {notification.severity === 'critical' && (
                      <Badge variant="destructive" className="text-[10px] px-1 py-0">
                        Urgente
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {notification.description}
                  </p>
                  <p className="text-xs text-muted-foreground/70">
                    {formatTime(notification.timestamp)}
                  </p>
                </div>
                {notification.alertId && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 hover:bg-severity-critical/20"
                    onClick={(e) => handleDismissAlert(e, notification.alertId!)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </>
        )}

        <DropdownMenuSeparator />
        <ScrollArea className="h-64">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Carregando...
            </div>
          ) : notifications.filter(n => n.type !== 'regression_alert').length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Nenhuma outra notificação
            </div>
          ) : (
            notifications
              .filter(n => n.type !== 'regression_alert')
              .map((notification) => {
                const Icon = notificationIcons[notification.type];
                const iconColor = notificationColors[notification.type];
                
                return (
                  <DropdownMenuItem
                    key={notification.id}
                    className="flex items-start gap-3 p-3 cursor-pointer"
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className={cn('mt-0.5', iconColor)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {notification.title}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {notification.description}
                      </p>
                      <p className="text-xs text-muted-foreground/70">
                        {formatTime(notification.timestamp)}
                      </p>
                    </div>
                  </DropdownMenuItem>
                );
              })
          )}
        </ScrollArea>
        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-center text-sm text-primary cursor-pointer"
              onClick={() => navigate('/diagnosticos')}
            >
              Ver todas atividades
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
