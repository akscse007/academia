import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  GraduationCap,
  BookOpen,
  Wallet,
  Shield,
  Palette,
  BarChart3,
  Users,
  FileText,
  ArrowRight,
} from 'lucide-react';

const features = [
  { icon: Palette, title: 'Fully branded', text: 'Every academy gets its own logo, colours, and login page.' },
  { icon: Shield, title: 'Fully isolated', text: 'Student, batch, note and payment data is scoped per academy.' },
  { icon: Wallet, title: 'UPI payments', text: 'Each academy configures its own UPI ID and QR code.' },
  { icon: FileText, title: 'Secure PDF viewer', text: 'In-browser, watermarked, access-controlled.' },
  { icon: BookOpen, title: 'Batch management', text: 'Schedules, fees, capacity, and enrollments.' },
  { icon: BarChart3, title: 'Financial reports', text: 'Monthly collection, overdue, downloadable in PDF/Excel.' },
];

export default function Landing() {
  return (
    <div className="min-h-screen">
      <header className="px-6 lg:px-12 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold">
          <GraduationCap className="h-6 w-6 text-brand" />
          <span>EduSuite</span>
        </div>
        <nav className="hidden md:flex items-center gap-6 text-sm">
          <a href="#features" className="hover:text-brand">Features</a>
          <Link to="/about-developer" className="hover:text-brand">About developer</Link>
          <Link to="/login" className="hover:text-brand">Login</Link>
          <Link to="/register-academy" className="btn-primary">Start an academy</Link>
        </nav>
      </header>
      <section className="px-6 lg:px-12 py-16 lg:py-24 max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <p className="inline-flex items-center gap-2 bg-brand/10 text-brand text-xs font-semibold rounded-full px-3 py-1">
            <GraduationCap className="h-3 w-3" />
            Multi-tenant SaaS for coaching centres
          </p>
          <h1 className="mt-5 text-4xl lg:text-6xl font-extrabold tracking-tight">
            Run your academy like a <span className="text-brand">premium brand</span>.
          </h1>
          <p className="mt-5 text-lg text-slate-600 dark:text-slate-300 max-w-2xl">
            One hosted platform, hundreds of independent academies. Private data,
            branded dashboards, UPI payments, secure PDF notes, and powerful reporting —
            all in one place.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/register-academy" className="btn-primary">
              Register your academy <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/login" className="btn-outline">I already have an account</Link>
          </div>
        </motion.div>

        <div id="features" className="mt-20 grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="card p-6"
            >
              <div className="h-10 w-10 rounded-lg bg-brand/10 text-brand flex items-center justify-center">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-3 font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-slate-500">{f.text}</p>
            </motion.div>
          ))}
        </div>

        <div className="mt-20 card p-8 lg:p-12 bg-gradient-to-br from-brand to-brand-700 text-white">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div>
              <h2 className="text-2xl lg:text-3xl font-bold">Ready to bring your academy online?</h2>
              <p className="opacity-80 mt-2 max-w-xl">
                Register, upload your logo, pick your colour and your UPI ID — you're live.
                Students sign up at yourplatform.com/your-academy.
              </p>
            </div>
            <Link to="/register-academy" className="btn bg-white text-brand hover:bg-slate-100">
              Get started <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="px-6 lg:px-12 py-10 text-center text-sm text-slate-500 border-t border-slate-100 dark:border-slate-800">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <span>© {new Date().getFullYear()} EduSuite. Built with the MERN stack.</span>
          <div className="flex gap-4">
            <Link to="/about-developer" className="hover:text-brand flex items-center gap-1">
              <Users className="h-4 w-4" /> About developer
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
