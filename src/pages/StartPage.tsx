import StartView from "../components/auth/StartView";

export default function StartPage({ onContinue }: { onContinue: () => void }) {
  return <StartView os="mac" onContinue={onContinue} />;
}
