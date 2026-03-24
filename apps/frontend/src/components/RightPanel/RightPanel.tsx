import IconButton from '../UI/IconButton';
import ChatGuide from './ChatGuide';
import ContactInfo from './ContactInfo';
import MembersPanel from './MembersPanel';
import NotificationToggle from './NotificationToggle';
import ProfileCard from './ProfileCard';
import SharedMedia from './SharedMedia';

export default function RightPanel({
  activeConversation,
  isMemberSearchLoading,
  isMuted,
  localTimeLabel,
  memberCandidates,
  memberSearchQuery,
  onAddParticipant,
  onShowToast,
  onMemberSearchChange,
  onToggleMuted,
}) {
  return (
    <aside className="right-panel">
      <div className="panel-header">
        <span className="panel-title">Contact Info</span>
        <IconButton title="Edit contact" onClick={() => onShowToast('Edit contact')}>
          ✏️
        </IconButton>
      </div>
      <div className="panel-body">
        <ProfileCard conversation={activeConversation} onShowToast={onShowToast} />
        <ContactInfo conversation={activeConversation} localTimeLabel={localTimeLabel} />
        <MembersPanel
          conversation={activeConversation}
          isLoading={isMemberSearchLoading}
          memberCandidates={memberCandidates}
          memberSearchQuery={memberSearchQuery}
          onAddParticipant={onAddParticipant}
          onMemberSearchChange={onMemberSearchChange}
        />
        <ChatGuide conversation={activeConversation} />
        <SharedMedia media={activeConversation.media} onShowToast={onShowToast} />
        <NotificationToggle isMuted={isMuted} onToggleMuted={onToggleMuted} />
      </div>
    </aside>
  );
}
