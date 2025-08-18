import { useTheme } from '@/app/contexts/ThemeContext';

interface SchemaProps {
  title: string;
  children: React.ReactNode;
}

export default function Schema({ title, children }: SchemaProps) {
  const { darkMode } = useTheme();
  
  return (
    <div className={`p-4 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
      <h4 className={`font-semibold mb-3 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>{title}</h4>
      <pre className="text-sm overflow-x-auto">
        <code className={`${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{children}</code>
      </pre>
    </div>
  );
}
