import CallBanner from './CallBanner';
import ChatHeader from './ChatHeader';
import Composer from './Composer';
import MessageList from './MessageList';
import ReplyBanner from './ReplyBanner';

export default function ChatWindow({
  activeConversation,
  activeMessages,
  callSeconds,
  closeReply,
  composerValue,
  currentUser,
  endCall,
  isCallActive,
  isEmojiOpen,
  isTyping,
  replyContext,
  sendMessage,
  setComposerValue,
  showToast,
  startCall,
  startReply,
  addEmoji,
  toggleEmoji,
}) {
  return (
    <main className="main">
      <ChatHeader
        activeConversation={activeConversation}
        onShowToast={showToast}
        onStartCall={startCall}
      />
      <CallBanner
        activeConversation={activeConversation}
        callSeconds={callSeconds}
        isVisible={isCallActive}
        onEndCall={endCall}
      />
      <MessageList
        activeConversation={activeConversation}
        currentUser={currentUser}
        messages={activeMessages}
        isTyping={isTyping}
        onReply={startReply}
        onShowToast={showToast}
      />
      <ReplyBanner replyContext={replyContext} onClose={closeReply} />
      <Composer
        activeConversation={activeConversation}
        composerValue={composerValue}
        isEmojiOpen={isEmojiOpen}
        onAddEmoji={addEmoji}
        onChange={setComposerValue}
        onSend={sendMessage}
        onShowToast={showToast}
        onToggleEmoji={toggleEmoji}
      />
    </main>
  );
}
