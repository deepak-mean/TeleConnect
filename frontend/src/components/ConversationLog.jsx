import { format } from 'date-fns';

export default function ConversationLog({ conversations }) {
  if (!conversations?.length) {
    return <p className="text-gray-400 text-sm text-center py-8">No conversations yet</p>;
  }

  return (
    <div className="space-y-6">
      {conversations.map(conv => (
        <div key={conv.id} className="border border-gray-100 rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-600">State: {conv.state}</span>
              {conv.is_urgent && (
                <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">URGENT</span>
              )}
            </div>
            <span className="text-xs text-gray-400">
              {format(new Date(conv.last_message_at), 'dd MMM, HH:mm')}
            </span>
          </div>

          <div className="p-4 space-y-2 max-h-64 overflow-y-auto">
            {conv.messages?.map(msg => (
              <div
                key={msg.id}
                className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                    msg.direction === 'outbound'
                      ? 'bg-brand-500 text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
