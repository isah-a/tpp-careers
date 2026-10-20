export function PublicFooter() {
  return (
    <footer className="w-full bg-white border-t border-gray-100 py-8 mt-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-900">OnCulture Careers</span>
          <span>•</span>
          <span>Talent &amp; Recruitment Platform</span>
        </div>

        <div>
          &copy; {new Date().getFullYear()} OnCulture. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
