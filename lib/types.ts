export type FileKind = "file" | "folder";

export type ProjectFile = {
  id: string;
  name: string;
  kind: FileKind;
  content?: string;
  children?: ProjectFile[];
  updatedAt?: string;
};

export type TemplateKey = "blank" | "portfolio" | "landing" | "app";

export type Project = {
  id: string;
  shareId?: string;
  name: string;
  template: TemplateKey;
  visibility: "private" | "public";
  files: ProjectFile[];
  createdAt: string;
  updatedAt: string;
  revision: number;
  color: string;
};

export type OpenFile = {
  id: string;
  name: string;
  content: string;
  dirty: boolean;
};
