import { useEffect, useState } from "react";
import { listUsers, updateUser } from "../../api/users";
import { useVoiceParts } from "../../hooks/useVoiceParts";
import PageHeader from "../../components/layout/PageHeader";
import DataTable from "../../components/admin/DataTable";
import Select from "../../components/common/Select";
import Badge from "../../components/common/Badge";
import ErrorMessage from "../../components/common/ErrorMessage";
import Spinner from "../../components/common/Spinner";

export default function UsersAdmin() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { voiceParts } = useVoiceParts();

  const load = () =>
    listUsers()
      .then((data) => setUsers(data.results ?? data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const handleRoleChange = async (user, role) => {
    setError(null);
    try {
      await updateUser(user.id, { role });
      await load();
    } catch (err) {
      setError(err.message || "Failed to update role.");
    }
  };

  const handleVoicePartChange = async (user, voicePartId) => {
    setError(null);
    try {
      await updateUser(user.id, { voice_part: voicePartId || null });
      await load();
    } catch (err) {
      setError(err.message || "Failed to update voice part.");
    }
  };

  if (loading) return <Spinner label="Loading users..." />;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Admin"
        title="Users"
        description="Manage roles and voice-part assignments for registered users."
      />

      <ErrorMessage message={error} />

      <DataTable
        rowKey="id"
        rows={users}
        emptyMessage="No users yet."
        columns={[
          { key: "email", header: "Email" },
          {
            key: "role",
            header: "Role",
            render: (row) => (
              <Select value={row.role} onChange={(e) => handleRoleChange(row, e.target.value)} className="py-1">
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </Select>
            ),
          },
          {
            key: "voice_part",
            header: "Voice part",
            render: (row) => (
              <Select
                value={row.voice_part?.id || ""}
                onChange={(e) => handleVoicePartChange(row, e.target.value)}
                className="py-1"
              >
                <option value="">— none —</option>
                {voiceParts.map((vp) => (
                  <option key={vp.id} value={vp.id}>
                    {vp.name}
                  </option>
                ))}
              </Select>
            ),
          },
          {
            key: "created_at",
            header: "Joined",
            render: (row) => new Date(row.created_at).toLocaleDateString(),
          },
        ]}
      />
    </div>
  );
}
