import { useAuth } from '../../context/AuthContext';
import ShareLinks from '../../components/ShareLinks';

export default function TeacherShare() {
  const { academy } = useAuth();
  return (
    <div className="space-y-4 max-w-4xl">
      <h1 className="text-2xl font-bold">Share with students</h1>
      <p className="text-sm text-slate-500">
        These are the branded entry points for your academy. Students who visit them see
        your logo, colours, and welcome message.
      </p>
      <ShareLinks academy={academy} />
    </div>
  );
}
