import React from 'react';
import { ArrowLeft, MoreHorizontal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ComponentType<any>;
  backButton?: boolean;
  backUrl?: string;
  actions?: React.ReactNode;
  breadcrumbs?: Array<{ name: string; href?: string }>;
  className?: string;
}

function PageHeader({ 
  title, 
  subtitle, 
  icon: Icon, 
  backButton = false, 
  backUrl,
  actions,
  breadcrumbs,
  children,
  className = '' 
}: PageHeaderProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (backUrl) {
      navigate(backUrl);
    } else {
      navigate(-1);
    }
  };

  return (
    <div className={`bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 ${className}`}>
      <div className="px-6 py-6">
        {/* Breadcrumbs */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="flex items-center space-x-2 text-sm mb-4">
            {breadcrumbs.map((crumb, index) => (
              <div key={index} className="flex items-center">
                {index > 0 && (
                  <span className="text-gray-400 dark:text-gray-500 mx-2">/</span>
                )}
                {crumb.href ? (
                  <button
                    onClick={() => navigate(crumb.href!)}
                    className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors duration-200"
                  >
                    {crumb.name}
                  </button>
                ) : (
                  <span className="text-gray-900 dark:text-white font-medium">
                    {crumb.name}
                  </span>
                )}
              </div>
            ))}
          </nav>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Back Button */}
            {backButton && (
              <button
                onClick={handleBack}
                className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200"
                title="Tillbaka"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}

            {/* Icon and Title */}
            <div className="flex items-center space-x-4">
              {Icon && (
                <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Icon className="w-6 h-6 text-white" />
                </div>
              )}
              
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white font-primary">
                  {title}
                </h1>
                {subtitle && (
                  <p className="mt-1 text-gray-600 dark:text-gray-400 font-secondary">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          {actions && (
            <div className="flex items-center space-x-3">
              {actions}
            </div>
          )}
        </div>
        {children && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            {children}
          </div>
        )}
        {/* ^-- END OF NEW SECTION --^ */}

      </div>
    </div>
  );
}
   

export default PageHeader;