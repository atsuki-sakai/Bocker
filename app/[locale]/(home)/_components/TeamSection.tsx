'use client'

import { useTranslations } from 'next-intl'
import Image from 'next/image'
import Link from 'next/link'
import { Instagram } from 'lucide-react'
import { motion } from 'framer-motion'

export const TeamSection = () => {
  const t = useTranslations('aboutPage')
  const people = [
    {
      name: 'Fujimoto Kyohei / 藤本恭平',
      role: t('team.role'),
      imageUrl: '/assets/images/kyohei_fujimoto.jpg',
      bio: t('team.bio'),
      xUrl: 'https://www.instagram.com/bocker_fujimoto',
      linkedinUrl: '#',
    },
  ]
  return (
    <section>
      <div className="bg-background py-24 md:py-32">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-20 px-6 lg:px-8 xl:grid-cols-5">
          <div className="max-w-2xl xl:col-span-2">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
              className="text-4xl font-semibold tracking-tight text-pretty text-primary sm:text-5xl"
            >
              {t('team.title')}
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.4 }}
              className="mt-6 text-sm md:text-base text-primary"
            >
              {t('team.description')}
            </motion.p>
          </div>
          <ul role="list" className="divide-y divide-border xl:col-span-3">
            {people.map((person) => (
              <li
                key={person.name}
                className="flex flex-col gap-10 py-12 first:pt-0 last:pb-0 sm:flex-row"
              >
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, ease: 'easeOut', delay: 0.6 }}
                  className="flex justify-center"
                >
                  <Image
                    width={1200}
                    height={1200}
                    alt=""
                    src={person.imageUrl}
                    className="aspect-4/5 w-52 flex-none rounded-2xl object-cover object-center shadow-md"
                  />
                </motion.div>
                <div className="max-w-xl flex-auto">
                  <motion.h3
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: 'easeOut', delay: 0.8 }}
                    className="text-lg/8 font-semibold tracking-tight text-primary"
                  >
                    {person.name}
                  </motion.h3>
                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: 'easeOut', delay: 1 }}
                    className="text-base/7 text-primary"
                  >
                    {person.role}
                  </motion.p>
                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: 'easeOut', delay: 1.2 }}
                    className="text-base/7 text-primary mt-6"
                  >
                    {person.bio}
                  </motion.p>
                  <ul role="list" className="mt-6 flex gap-x-6">
                    <li>
                      <Link href={person.xUrl} className="text-accent hover:text-accent">
                        <span className="sr-only">Instagram</span>
                        <Instagram className="size-5 text-pink-500" />
                      </Link>
                    </li>
                  </ul>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
