import Image from 'next/image'

const logos = [
  {
    company: 'Transistor',
    src: 'https://tailwindcss.com/plus-assets/img/logos/158x48/transistor-logo-gray-900.svg',
  },
  {
    company: 'Reform',
    src: 'https://tailwindcss.com/plus-assets/img/logos/158x48/reform-logo-gray-900.svg',
  },
  {
    company: 'Tuple',
    src: 'https://tailwindcss.com/plus-assets/img/logos/158x48/tuple-logo-gray-900.svg',
  },
  {
    company: 'SavvyCal',
    src: 'https://tailwindcss.com/plus-assets/img/logos/158x48/savvycal-logo-gray-900.svg',
  },
  {
    company: 'Statamic',
    src: 'https://tailwindcss.com/plus-assets/img/logos/158x48/statamic-logo-gray-900.svg',
  },
]
export function LogoSlider() {
  return (
    <div data-testid="logo-slider" className="bg-background py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* <h2 className="text-center text-lg/8 font-semibold text-gray-900">
            ご利用いただいているお客様方
          </h2> */}
        <div className="mx-auto mt-10 grid max-w-lg grid-cols-4 items-center gap-x-8 gap-y-10 sm:max-w-xl sm:grid-cols-6 sm:gap-x-10 lg:mx-0 lg:max-w-none lg:grid-cols-5">
          {logos.map((logo) => (
            <Image
              key={logo.company}
              src={logo.src}
              alt={logo.company}
              width={158}
              height={48}
              className="col-span-2 max-h-12 w-full object-contain lg:col-span-1"
            />
          ))}
        </div>
      </div>
    </div>
  )
}
