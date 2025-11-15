'use client';

import { motion } from 'framer-motion';
import {
  Zap,
  Shield,
  TrendingUp,
  Activity,
  ArrowRight,
  Target,
  BarChart3,
  Wallet
} from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  const fadeInUp = {
    initial: { opacity: 0, y: 60 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 }
  };

  const staggerContainer = {
    animate: {
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const features = [
    {
      icon: Zap,
      title: 'Auto Yield Optimization',
      description: 'Automatically finds and optimizes yield across liquidity pools to maximize your returns.',
      color: 'from-yellow-400 to-orange-500'
    },
    {
      icon: Shield,
      title: 'Risk Management',
      description: 'Smart risk assessment and portfolio balancing to protect your investments.',
      color: 'from-green-400 to-cyan-500'
    },
    {
      icon: Target,
      title: 'Strategy Selection',
      description: 'Choose between APY-focused or balanced strategies tailored to your goals.',
      color: 'from-blue-400 to-purple-500'
    },
    {
      icon: Activity,
      title: 'Real-Time Tracking',
      description: 'Live portfolio monitoring and position tracking with instant updates.',
      color: 'from-pink-400 to-red-500'
    }
  ];

  const steps = [
    {
      number: '01',
      title: 'Connect Wallet',
      description: 'Securely connect your HyperLiquid wallet to get started'
    },
    {
      number: '02',
      title: 'Choose Strategy',
      description: 'Select between APY-focused or optimized balanced strategy'
    },
    {
      number: '03',
      title: 'Start Earning',
      description: 'Let our algorithm optimize your positions automatically'
    }
  ];

  const stats = [
    { label: 'Total Value Locked', value: '$2.5M+', suffix: '' },
    { label: 'Active Users', value: '1,200+', suffix: '' },
    { label: 'Average APY', value: '24', suffix: '%' },
    { label: 'Pools Supported', value: '50+', suffix: '' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Floating background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-gray-800 bg-gray-900/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center space-x-2"
            >
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-primary-500 to-purple-500 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <span className="text-xl sm:text-2xl font-bold text-white">HyperGlueX</span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <Link href="/dashboard">
                <button className="px-3 sm:px-6 py-2.5 sm:py-3 bg-primary-500 hover:bg-primary-600 text-white text-sm sm:text-base font-semibold rounded-lg transition-all duration-200 flex items-center gap-2 shadow-lg shadow-primary-500/50 hover:shadow-xl hover:shadow-primary-500/50 min-h-[44px]">
                  <Wallet className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="hidden xs:inline">Connect Wallet</span>
                  <span className="xs:hidden">Connect</span>
                </button>
              </Link>
            </motion.div>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        {/* Hero Section */}
        <section className="relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 md:py-32">
            <div className="text-center">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
              >
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold text-white mb-4 sm:mb-6 px-2">
                  Maximize Your{' '}
                  <span className="bg-gradient-to-r from-primary-400 via-purple-400 to-pink-400 bg-clip-text text-transparent animate-gradient">
                    DeFi Yields
                  </span>
                </h1>
                <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-300 mb-6 sm:mb-8 max-w-3xl mx-auto px-4">
                  Your intelligent HyperLiquid companion. Automated yield optimization with smart risk management.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.8 }}
                className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-stretch sm:items-center px-4"
              >
                <Link href="/dashboard" className="w-full sm:w-auto">
                  <button className="group w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-primary-500 to-purple-500 hover:from-primary-600 hover:to-purple-600 text-white text-base sm:text-lg font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-2xl shadow-primary-500/50 hover:shadow-primary-500/70 hover:scale-105 min-h-[48px]">
                    Get Started
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                </Link>
                <Link href="/dashboard/strategies" className="w-full sm:w-auto">
                  <button className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700 hover:border-gray-600 text-white text-base sm:text-lg font-semibold rounded-xl transition-all duration-300 backdrop-blur-sm min-h-[48px]">
                    Explore Strategies
                  </button>
                </Link>
              </motion.div>

              {/* Stats */}
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.8 }}
                className="mt-12 sm:mt-16 md:mt-20 grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 md:gap-8 px-4"
              >
                {stats.map((stat, index) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.8 + index * 0.1, duration: 0.5 }}
                    className="text-center"
                  >
                    <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary-400 to-purple-400 bg-clip-text text-transparent mb-2">
                      {stat.value}{stat.suffix}
                    </div>
                    <div className="text-sm text-gray-400">{stat.label}</div>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 bg-gradient-to-b from-transparent to-gray-900/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
                Powerful Features
              </h2>
              <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                Everything you need to optimize your DeFi portfolio
              </p>
            </motion.div>

            <motion.div
              variants={staggerContainer}
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 md:gap-8"
            >
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <motion.div
                    key={feature.title}
                    variants={fadeInUp}
                    whileHover={{ y: -10, transition: { duration: 0.2 } }}
                    className="group relative bg-gray-800/50 backdrop-blur-sm rounded-2xl p-5 sm:p-6 md:p-8 border border-gray-700 hover:border-gray-600 transition-all duration-300"
                  >
                    <div className={`w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 sm:mb-6 group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-white" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-white mb-2 sm:mb-3">
                      {feature.title}
                    </h3>
                    <p className="text-sm sm:text-base text-gray-400 leading-relaxed">
                      {feature.description}
                    </p>

                    {/* Glow effect on hover */}
                    <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-10 blur-xl transition-opacity duration-300`}></div>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-12 sm:py-16 md:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-10 sm:mb-12 md:mb-16"
            >
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-3 sm:mb-4">
                How It Works
              </h2>
              <p className="text-base sm:text-lg md:text-xl text-gray-400 max-w-2xl mx-auto px-4">
                Start earning in three simple steps
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 md:gap-4 relative">
              {/* Connection lines */}
              <div className="hidden md:block absolute top-24 left-1/3 right-1/3 h-0.5 bg-gradient-to-r from-primary-500 via-purple-500 to-pink-500"></div>

              {steps.map((step, index) => (
                <motion.div
                  key={step.number}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.2, duration: 0.6 }}
                  className="relative text-center"
                >
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-primary-500 to-purple-500 text-white text-2xl font-bold mb-6 shadow-xl shadow-primary-500/50">
                    {step.number}
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-3">
                    {step.title}
                  </h3>
                  <p className="text-gray-400 max-w-xs mx-auto">
                    {step.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-12 sm:py-16 md:py-20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative overflow-hidden bg-gradient-to-r from-primary-600 to-purple-600 rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-12 text-center shadow-2xl"
            >
              {/* Animated background */}
              <div className="absolute inset-0 bg-gradient-to-r from-primary-600/20 to-purple-600/20 animate-pulse"></div>

              <div className="relative z-10">
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3 sm:mb-4 px-2">
                  Ready to Optimize Your Yields?
                </h2>
                <p className="text-base sm:text-lg md:text-xl text-white/90 mb-6 sm:mb-8 px-2">
                  Join thousands of users maximizing their DeFi returns
                </p>
                <Link href="/dashboard" className="inline-block w-full sm:w-auto">
                  <button className="w-full sm:w-auto px-6 sm:px-10 py-3 sm:py-4 bg-white hover:bg-gray-100 text-primary-600 text-base sm:text-lg font-bold rounded-xl transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-105 flex items-center justify-center gap-2 mx-auto min-h-[48px]">
                    <Wallet className="w-5 h-5 sm:w-6 sm:h-6" />
                    Connect Wallet Now
                    <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </Link>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-gray-800 bg-gray-900/50 backdrop-blur-xl mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-400">
            <p>&copy; 2024 HyperGlueX. Built for HyperLiquid.</p>
          </div>
        </div>
      </footer>

      <style jsx>{`
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient {
          background-size: 200% auto;
          animation: gradient 3s ease infinite;
        }
      `}</style>
    </div>
  );
}
