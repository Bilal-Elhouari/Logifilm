import StartView from "../components/auth/StartView";

export default function StartPageWindows({ onContinue }: { onContinue: () => void }) {
  return <StartView os="win" onContinue={onContinue} />;
}
