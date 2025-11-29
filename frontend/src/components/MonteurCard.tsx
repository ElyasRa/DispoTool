import { useDroppable } from '@dnd-kit/core';
import { Monteur } from '../types/models';

interface MonteurCardProps {
  monteur: Monteur;
  isOver?: boolean;
}

function MonteurCard({ monteur, isOver }: MonteurCardProps) {
  const { setNodeRef, isOver: isOverCurrent } = useDroppable({
    id: `monteur-${monteur.id}`,
    data: { monteur },
  });

  const isHighlighted = isOver || isOverCurrent;

  return (
    <div
      ref={setNodeRef}
      className={`
        bg-white rounded-lg shadow-md p-4 mb-3 
        border-2 transition-all duration-200
        ${isHighlighted 
          ? 'border-blue-500 bg-blue-50 scale-[1.02]' 
          : 'border-transparent hover:border-gray-300'
        }
      `}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
          {monteur.vorname.charAt(0)}{monteur.name.charAt(0)}
        </div>
        <div>
          <h4 className="font-semibold text-gray-800">
            {monteur.vorname} {monteur.name}
          </h4>
          <p className="text-sm text-gray-500">{monteur.region}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="bg-blue-50 rounded-lg p-2">
          <span className="block text-blue-600 font-bold text-lg">
            {monteur.assigned_orders || 0}
          </span>
          <span className="text-gray-500">Zugewiesen</span>
        </div>
        <div className="bg-green-50 rounded-lg p-2">
          <span className="block text-green-600 font-bold text-lg">
            {monteur.accepted_orders || 0}
          </span>
          <span className="text-gray-500">Angenommen</span>
        </div>
        <div className="bg-gray-50 rounded-lg p-2">
          <span className="block text-gray-600 font-bold text-lg">
            {monteur.completed_orders || 0}
          </span>
          <span className="text-gray-500">Erledigt</span>
        </div>
      </div>

      {monteur.telegram_chat_id && (
        <div className="mt-3 flex items-center gap-1 text-xs text-green-600">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
          <span>Telegram verbunden</span>
        </div>
      )}

      {isHighlighted && (
        <div className="mt-3 text-center text-sm text-blue-600 font-medium animate-pulse">
          Auftrag hier ablegen
        </div>
      )}
    </div>
  );
}

export default MonteurCard;
