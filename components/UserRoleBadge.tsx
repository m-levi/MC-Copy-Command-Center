import { OrganizationRole } from '@/types';

interface UserRoleBadgeProps {
  role: OrganizationRole;
}

export default function UserRoleBadge({ role }: UserRoleBadgeProps) {
  const getRoleConfig = (role: OrganizationRole) => {
    switch (role) {
      case 'admin':
        return {
          label: 'Admin',
          color: 'bg-purple-100 text-purple-800 border-purple-200',
          icon: (
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
            </svg>
          )
        };
      case 'brand_manager':
        return {
          label: 'Brand Manager',
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: (
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
            </svg>
          )
        };
      case 'member':
        return {
          label: 'Member',
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: (
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
          )
        };
    }
  };

  const config = getRoleConfig(role);

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${config.color}`}>
      {config.icon}
      {config.label}
    </span>
  );
}

