import ProfileSection from './profile-section';
import LocationSection from './location-section';
import NotificationsSection from './notifications-section';
import MatchmakingSection from './matchmaking-section';
import AccountSection from './account-section';

type EmailFrequency = 'instant' | 'daily' | 'weekly' | 'never';
type MatchRadius = 'neighborhood' | 'department' | 'country';

type Props = {
  initialName: string;
  initialBio: string;
  initialCity: string;
  initialNeighborhood: string;
  initialWhatsapp: string;
  initialPublicProfile: boolean;
  initialNotifyOnMatch: boolean;
  initialEmailFrequency: EmailFrequency;
  initialPushEnabled: boolean;
  initialParticipatesInMatchmaking: boolean;
  initialMatchRadius: MatchRadius;
  initialOfferUniques: boolean;
  initialAcceptUnbalanced: boolean;
};

export default function SettingsForm({
  initialName,
  initialBio,
  initialCity,
  initialNeighborhood,
  initialWhatsapp,
  initialPublicProfile,
  initialNotifyOnMatch,
  initialEmailFrequency,
  initialPushEnabled,
  initialParticipatesInMatchmaking,
  initialMatchRadius,
  initialOfferUniques,
  initialAcceptUnbalanced,
}: Props) {
  return (
    <div className="space-y-8">
      <ProfileSection
        initialName={initialName}
        initialBio={initialBio}
        initialWhatsapp={initialWhatsapp}
        initialPublicProfile={initialPublicProfile}
      />
      <LocationSection initialCity={initialCity} initialNeighborhood={initialNeighborhood} />
      <NotificationsSection
        initialNotifyOnMatch={initialNotifyOnMatch}
        initialEmailFrequency={initialEmailFrequency}
        initialPushEnabled={initialPushEnabled}
      />
      <MatchmakingSection
        initialParticipatesInMatchmaking={initialParticipatesInMatchmaking}
        initialMatchRadius={initialMatchRadius}
        initialOfferUniques={initialOfferUniques}
        initialAcceptUnbalanced={initialAcceptUnbalanced}
      />
      <AccountSection />
    </div>
  );
}
