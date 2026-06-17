interface PageHeaderProps {
  title: string;
  description: string;
}

export default function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <header className="page-header">
      <h2>{title}</h2>
      <p>{description}</p>
    </header>
  );
}
