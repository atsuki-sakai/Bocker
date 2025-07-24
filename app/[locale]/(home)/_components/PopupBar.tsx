'use client'

import { useEffect, useState } from 'react'
import { XMarkIcon } from '@heroicons/react/20/solid'
import { useTranslations } from 'next-intl'

export function PopupBar() {
    const t = useTranslations('landing.popupBar')
    const [isPopupBar, setIsPopupBar] = useState(false)
  
    function getCookie(name: string): string | null {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop()!.split(';').shift() || null;
        return null;
      }
    useEffect(() => {
        const popupBar = getCookie('popupBar');
        if (!popupBar) {
          setIsPopupBar(true);
        }
      }, []);

    if (!isPopupBar) {
        return null
    }

  return (
    <>
      {/*
        Make sure you add some bottom padding to pages that include a sticky banner like this to prevent
        your content from being obscured when the user scrolls to the bottom of the page.
      */}
      <div
        data-id="popup-bar"
        className="pointer-events-none fixed left-0 right-30 bottom-0 sm:px-6 sm:pb-5 lg:px-8 z-50"
      >
        <div className="pointer-events-auto flex items-center justify-between gap-x-6 bg-pop-foreground px-6 py-2.5 sm:rounded-xl sm:py-3 sm:pr-3.5 sm:pl-4">
          <p className="text-sm/6 text-pop">
            <a href="#">
              <strong className="font-semibold">{t('title')}</strong>
              <svg
                viewBox="0 0 2 2"
                aria-hidden="true"
                className="mx-2 inline size-0.5 fill-current"
              >
                <circle r={1} cx={1} cy={1} />
              </svg>
              　{t('description')}{' '}
              <strong className="tracking-wide text-base">{t('discount')}</strong>
            </a>
          </p>
          <button
            type="button"
            onClick={() => {
              document.cookie = 'popupBar=true; max-age=600; path=/'
              setIsPopupBar(false)
            }}
            className="-m-3 flex-none p-3 focus-visible:-outline-offset-4"
          >
            <span className="sr-only">Dismiss</span>
            <XMarkIcon aria-hidden="true" className="size-5 text-pop" />
          </button>
        </div>
      </div>
    </>
  )
}
