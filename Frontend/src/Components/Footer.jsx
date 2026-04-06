import React from 'react'

const Footer = () => {
  return (
    <footer className="border-t border-white/10">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="text-sm font-semibold tracking-tight">TabTrack</div>
            <div className="text-xs text-mutedForeground mt-1">
              Premium focus analytics, built for clarity.
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-mutedForeground">
            <a className="hover:text-foreground transition" href="#">
              Privacy
            </a>
            <a className="hover:text-foreground transition" href="#">
              Terms
            </a>
            <a className="hover:text-foreground transition" href="#">
              Support
            </a>
          </div>
        </div>

        <div className="mt-8 text-xs text-mutedForeground">
          © {new Date().getFullYear()} TabTrack. All rights reserved.
        </div>
      </div>
    </footer>
  )
}

export default Footer;