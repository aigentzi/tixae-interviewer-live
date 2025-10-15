import { FC } from "react";

export type ComponentWithHeaderProps = {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
}

export const AppPageHeader: FC<ComponentWithHeaderProps> = ({ title, description, icon, actions }) => {
  return (
    <div className="flex flex-row gap-4 justify-between items-center w-full">
      <div className="flex flex-row items-center gap-6">
        <div className="flex flex-row items-center gap-2">
          {icon}
        </div>
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-bold">{title}</h2>
          <p className="text-sm text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
      <div className="flex flex-row gap-2">
        {actions}
      </div>
    </div>
  );
}
