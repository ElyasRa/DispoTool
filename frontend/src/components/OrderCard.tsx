import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Auftrag } from '../types/models';

interface OrderCardProps {
  order: Auftrag;
  isDraggable?: boolean;
}

function OrderCard({ order, isDraggable = true }: OrderCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `order-${order.id}`,
    data: { order },
    disabled: !isDraggable,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  const statusColors: Record<string, string> = {
    Neu: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    Zugewiesen: 'bg-blue-100 text-blue-800 border-blue-300',
    Angenommen: 'bg-green-100 text-green-800 border-green-300',
    Erledigt: 'bg-gray-100 text-gray-800 border-gray-300',
    Storno: 'bg-red-100 text-red-800 border-red-300',
    Abgelehnt: 'bg-orange-100 text-orange-800 border-orange-300',
  };

  const gewerkColors: Record<string, string> = {
    Elektro: 'bg-purple-500',
    Klempner: 'bg-cyan-500',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(isDraggable ? { ...listeners, ...attributes } : {})}
      className={`
        bg-white rounded-lg shadow-md border-l-4 p-4 mb-3 
        ${isDragging ? 'shadow-xl cursor-grabbing' : 'hover:shadow-lg cursor-grab'}
        ${isDraggable ? '' : 'cursor-default'}
        transition-shadow duration-200
      `}
    >
      <div className="flex justify-between items-start mb-2">
        <span className="text-sm font-mono text-gray-600">
          {order.auftragsnummer}
        </span>
        <div className="flex gap-2">
          <span className={`text-xs px-2 py-1 rounded-full text-white ${gewerkColors[order.gewerk] || 'bg-gray-500'}`}>
            {order.gewerk}
          </span>
          <span className={`text-xs px-2 py-1 rounded-full border ${statusColors[order.status] || 'bg-gray-100'}`}>
            {order.status}
          </span>
        </div>
      </div>
      
      <h4 className="font-semibold text-gray-800 mb-1">
        {order.vorname} {order.name}
      </h4>
      
      <p className="text-sm text-gray-600 mb-2">
        {order.strasse} {order.hausnummer}, {order.plz} {order.stadt}
      </p>
      
      <div className="flex justify-between items-center text-xs text-gray-500">
        <span>{order.auftraggeber_typ}</span>
        <span>{order.region}</span>
      </div>

      {order.monteur_name && (
        <div className="mt-2 pt-2 border-t border-gray-200">
          <span className="text-xs text-gray-600">
            Monteur: {order.monteur_vorname} {order.monteur_name}
          </span>
        </div>
      )}
    </div>
  );
}

export default OrderCard;
