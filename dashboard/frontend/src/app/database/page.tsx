"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import {
  Database,
  Loader2,
  Copy,
  Check,
  Server,
  Key,
  User,
  Lock,
  ExternalLink,
  Terminal,
  FileCode,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchContainers } from "@/lib/api";

// Import DS components
import {
  PageHeader,
  RefreshButton,
  Section,
  SectionHeader,
  Grid,
  ConfigValue,
  IconBox,
  StatusDot,
} from "@/components/ds";

// Database connection details (from docker-compose.yml)
const DB_CONFIG = {
  host: "localhost",
  port: "5432",
  database: "anchor",
  user: "anchor",
  password: "anchor",
};

export default function DatabasePage() {
  const { t } = useTranslation();
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const {
    data: containersData,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["containers"],
    queryFn: fetchContainers,
    refetchInterval: 5000,
  });

  const containers = containersData?.containers || [];
  const dbContainer = containers.find(
    (c) => c.name === "anchor-core-postgres"
  );
  const isRunning = dbContainer?.state === "running";

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const connectionString = `postgres://${DB_CONFIG.user}:${DB_CONFIG.password}@${DB_CONFIG.host}:${DB_CONFIG.port}/${DB_CONFIG.database}`;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        icon={Database}
        iconColor="blue"
        title={t("database.title")}
        subtitle={isRunning ? t("database.subtitle") : t("database.notRunning")}
        actions={
          <RefreshButton loading={isRefetching} onClick={() => refetch()} />
        }
      />

      {/* Status Card */}
      <Section>
        <div className="flex items-center gap-3 mb-6">
          <IconBox
            icon={Database}
            color={isRunning ? "blue" : "muted"}
            size="lg"
          />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-foreground">{t("database.databaseStatus")}</h2>
              <StatusDot
                status={isRunning ? "running" : "stopped"}
                label={isRunning ? t("node.running") : t("node.stopped")}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {t("database.storingData")}
            </p>
          </div>
        </div>

        {isRunning && (
          <Grid cols={{ default: 1, md: 3 }} gap="md">
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Server className="w-4 h-4 text-blue-500" />
                <span className="text-xs text-muted-foreground">Version</span>
              </div>
              <p className="text-lg font-bold text-foreground">PostgreSQL 16</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Database className="w-4 h-4 text-blue-500" />
                <span className="text-xs text-muted-foreground">Database</span>
              </div>
              <p className="text-lg font-bold text-foreground">{DB_CONFIG.database}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Key className="w-4 h-4 text-blue-500" />
                <span className="text-xs text-muted-foreground">Port</span>
              </div>
              <p className="text-lg font-bold text-foreground">{DB_CONFIG.port}</p>
            </div>
          </Grid>
        )}
      </Section>

      {/* Connection Details */}
      {isRunning && (
        <Section>
          <SectionHeader
            icon={Lock}
            iconColor="blue"
            title={t("database.connectionCredentials")}
            subtitle={t("database.useToConnect")}
          />

          <div className="space-y-3">
            <CredentialRow
              icon={<Server className="w-4 h-4" />}
              label={t("database.host")}
              value={DB_CONFIG.host}
              onCopy={() => copyToClipboard(DB_CONFIG.host, "host")}
              copied={copiedField === "host"}
              t={t}
            />
            <CredentialRow
              icon={<Key className="w-4 h-4" />}
              label={t("database.port")}
              value={DB_CONFIG.port}
              onCopy={() => copyToClipboard(DB_CONFIG.port, "port")}
              copied={copiedField === "port"}
              t={t}
            />
            <CredentialRow
              icon={<Database className="w-4 h-4" />}
              label="Database"
              value={DB_CONFIG.database}
              onCopy={() => copyToClipboard(DB_CONFIG.database, "database")}
              copied={copiedField === "database"}
              t={t}
            />
            <CredentialRow
              icon={<User className="w-4 h-4" />}
              label={t("database.user")}
              value={DB_CONFIG.user}
              onCopy={() => copyToClipboard(DB_CONFIG.user, "user")}
              copied={copiedField === "user"}
              t={t}
            />
            <CredentialRow
              icon={<Lock className="w-4 h-4" />}
              label={t("database.password")}
              value={DB_CONFIG.password}
              onCopy={() => copyToClipboard(DB_CONFIG.password, "password")}
              copied={copiedField === "password"}
              isPassword
              t={t}
            />
          </div>

          {/* Connection String */}
          <div className="mt-6">
            <ConfigValue
              label={t("database.connectionString")}
              value={connectionString}
              mono
            />
          </div>
        </Section>
      )}

      {/* Quick Commands */}
      {isRunning && (
        <Section>
          <SectionHeader
            icon={Terminal}
            iconColor="muted"
            title={t("database.quickCommands")}
            subtitle={t("database.commonCommands")}
          />

          <div className="space-y-4">
            <CommandCard
              title={t("database.connectPsql")}
              description={t("database.openShell")}
              command="docker exec -it anchor-core-postgres psql -U anchor -d anchor"
              onCopy={() =>
                copyToClipboard(
                  "docker exec -it anchor-core-postgres psql -U anchor -d anchor",
                  "psql"
                )
              }
              copied={copiedField === "psql"}
              t={t}
            />
            <CommandCard
              title={t("database.listTables")}
              description={t("database.showAllTables")}
              command="docker exec -it anchor-core-postgres psql -U anchor -d anchor -c '\\dt'"
              onCopy={() =>
                copyToClipboard(
                  "docker exec -it anchor-core-postgres psql -U anchor -d anchor -c '\\dt'",
                  "tables"
                )
              }
              copied={copiedField === "tables"}
              t={t}
            />
            <CommandCard
              title={t("database.countMessages")}
              description={t("database.countTotal")}
              command="docker exec -it anchor-core-postgres psql -U anchor -d anchor -c 'SELECT COUNT(*) FROM messages;'"
              onCopy={() =>
                copyToClipboard(
                  "docker exec -it anchor-core-postgres psql -U anchor -d anchor -c 'SELECT COUNT(*) FROM messages;'",
                  "count"
                )
              }
              copied={copiedField === "count"}
              t={t}
            />
          </div>
        </Section>
      )}

      {/* Compatible Clients */}
      {isRunning && (
        <Section>
          <SectionHeader
            icon={FileCode}
            iconColor="purple"
            title={t("database.compatibleClients")}
            subtitle={t("database.popularTools")}
          />

          <Grid cols={{ default: 1, md: 2, lg: 3 }} gap="md">
            <ClientCard
              name="TablePlus"
              description="Modern, native database client"
              url="https://tableplus.com/"
            />
            <ClientCard
              name="DBeaver"
              description="Free universal database tool"
              url="https://dbeaver.io/"
            />
            <ClientCard
              name="pgAdmin"
              description="Official PostgreSQL admin tool"
              url="https://www.pgadmin.org/"
            />
            <ClientCard
              name="DataGrip"
              description="JetBrains database IDE"
              url="https://www.jetbrains.com/datagrip/"
            />
            <ClientCard
              name="Postico"
              description="PostgreSQL client for Mac"
              url="https://eggerapps.at/postico2/"
            />
            <ClientCard
              name="Beekeeper Studio"
              description="Open source SQL editor"
              url="https://www.beekeeperstudio.io/"
            />
          </Grid>
        </Section>
      )}

      {/* Not running message */}
      {!isRunning && (
        <Section className="text-center py-8">
          <Database className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">
            {t("database.notRunningMsg")}
          </h2>
          <p className="text-muted-foreground mb-4">
            {t("database.startWith")}:{" "}
            <code className="bg-muted px-2 py-1 rounded">
              docker compose up -d core-postgres
            </code>
          </p>
        </Section>
      )}
    </div>
  );
}

function CredentialRow({
  icon,
  label,
  value,
  onCopy,
  copied,
  isPassword = false,
  t,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onCopy: () => void;
  copied: boolean;
  isPassword?: boolean;
  t: (key: string) => string;
}) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <div className="flex items-center gap-3">
        <span className="text-muted-foreground">{icon}</span>
        <span className="text-sm text-muted-foreground w-20">{label}</span>
        <span className="text-sm font-mono font-medium text-foreground">
          {isPassword && !showPassword ? "••••••" : value}
        </span>
        {isPassword && (
          <button
            onClick={() => setShowPassword(!showPassword)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            {showPassword ? t("database.hide") : t("database.show")}
          </button>
        )}
      </div>
      <button
        onClick={onCopy}
        className="p-1.5 hover:bg-muted rounded transition-colors"
      >
        {copied ? (
          <Check className="w-4 h-4 text-success" />
        ) : (
          <Copy className="w-4 h-4 text-muted-foreground" />
        )}
      </button>
    </div>
  );
}

function CommandCard({
  title,
  description,
  command,
  onCopy,
  copied,
  t,
}: {
  title: string;
  description: string;
  command: string;
  onCopy: () => void;
  copied: boolean;
  t: (key: string) => string;
}) {
  return (
    <div className="p-4 bg-muted/50 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="font-medium text-foreground text-sm">{title}</h3>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <button
          onClick={onCopy}
          className="flex items-center gap-1 px-2 py-1 text-xs bg-muted hover:bg-muted/80 rounded transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-success" />
              {t("common.copied")}
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              {t("database.copy")}
            </>
          )}
        </button>
      </div>
      <code className="text-xs font-mono text-muted-foreground break-all">
        {command}
      </code>
    </div>
  );
}

function ClientCard({
  name,
  description,
  url,
}: {
  name: string;
  description: string;
  url: string;
}) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-between p-4 bg-muted/50 hover:bg-muted rounded-lg transition-colors group"
    >
      <div>
        <h3 className="font-medium text-foreground text-sm group-hover:text-primary transition-colors">
          {name}
        </h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
    </a>
  );
}
