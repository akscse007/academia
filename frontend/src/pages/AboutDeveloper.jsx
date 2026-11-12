import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Github, Globe, Linkedin, Mail, Twitter, Instagram, GraduationCap, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../api/client';
import Loader from '../components/Loader';

export default function AboutDeveloper() {
  const [d, setD] = useState(null);
  useEffect(() => {
    api.get('/developer').then(({ data }) => setD(data || {}));
  }, []);

  if (!d) return <Loader />;

  const socials = [
    d.github && { icon: Github, label: 'GitHub', href: d.github },
    d.linkedin && { icon: Linkedin, label: 'LinkedIn', href: d.linkedin },
    d.twitter && { icon: Twitter, label: 'Twitter', href: d.twitter },
    d.instagram && { icon: Instagram, label: 'Instagram', href: d.instagram },
    d.website && { icon: Globe, label: 'Website', href: d.website },
    d.email && { icon: Mail, label: 'Email', href: `mailto:${d.email}` },
  ].filter(Boolean);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-brand/5 dark:from-slate-950 dark:to-slate-900">
      <header className="px-6 lg:px-12 py-5 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-bold">
          <GraduationCap className="h-6 w-6 text-brand" /> EduSuite
        </Link>
        <Link to="/" className="btn-ghost text-sm">
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>
      </header>
      <section className="max-w-4xl mx-auto px-6 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-8 lg:p-12 text-center"
        >
          {d.photoUrl ? (
            <img src={d.photoUrl} alt="" className="h-32 w-32 rounded-full mx-auto object-cover" />
          ) : (
            <div className="h-32 w-32 mx-auto rounded-full bg-gradient-to-br from-brand to-brand-700 text-white text-4xl font-bold flex items-center justify-center">
              {d.name?.[0] || 'D'}
            </div>
          )}
          <h1 className="mt-4 text-3xl font-extrabold">{d.name}</h1>
          <p className="mt-2 text-brand font-medium">{d.intro}</p>
          <p className="mt-4 text-slate-600 dark:text-slate-300 max-w-2xl mx-auto whitespace-pre-line">
            {d.about}
          </p>
          {socials.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2 justify-center">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-outline text-sm"
                >
                  <s.icon className="h-4 w-4" /> {s.label}
                </a>
              ))}
            </div>
          )}
        </motion.div>

        {d.skills?.length > 0 && (
          <div className="mt-10">
            <h2 className="text-lg font-bold">Skills & technologies</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {d.skills.map((s) => (
                <span key={s} className="badge-muted">{s}</span>
              ))}
            </div>
          </div>
        )}

        {d.projects?.length > 0 && (
          <div className="mt-10">
            <h2 className="text-lg font-bold">Projects & experience</h2>
            <div className="mt-4 grid md:grid-cols-2 gap-4">
              {d.projects.map((p, i) => (
                <a
                  key={i}
                  href={p.url || '#'}
                  target="_blank"
                  rel="noreferrer"
                  className="card p-5 hover:shadow-lg transition"
                >
                  <h3 className="font-semibold">{p.title}</h3>
                  <p className="text-sm text-slate-500 mt-1">{p.description}</p>
                </a>
              ))}
            </div>
          </div>
        )}
      </section>
      <footer className="py-8 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} — Portfolio page of the platform developer
      </footer>
    </div>
  );
}
