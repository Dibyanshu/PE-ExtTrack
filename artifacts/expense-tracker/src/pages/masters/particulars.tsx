import { useState } from "react";
import {
  useListParticulars,
  useCreateParticular,
  useUpdateParticular,
  useDeleteParticular,
  getListParticularsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { MasterPage } from "./master-page";

export default function Particulars() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useListParticulars({ search: search || undefined, page, limit: 20 });
  const create = useCreateParticular();
  const update = useUpdateParticular();
  const remove = useDeleteParticular();

  async function handleAdd(name: string) {
    await new Promise<void>((resolve, reject) => {
      create.mutate({ data: { name } }, {
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListParticularsQueryKey() }); resolve(); },
        onError: reject,
      });
    });
  }

  async function handleEdit(id: number, name: string) {
    await new Promise<void>((resolve, reject) => {
      update.mutate({ id, data: { name } }, {
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListParticularsQueryKey() }); resolve(); },
        onError: reject,
      });
    });
  }

  async function handleDelete(id: number) {
    await new Promise<void>((resolve, reject) => {
      remove.mutate({ id }, {
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListParticularsQueryKey() }); resolve(); },
        onError: reject,
      });
    });
  }

  return (
    <MasterPage
      title="Particulars"
      items={data?.data}
      total={data?.total}
      isLoading={isLoading}
      isError={isError}
      page={page}
      setPage={setPage}
      search={search}
      setSearch={setSearch}
      queryKey={getListParticularsQueryKey()}
      onAdd={handleAdd}
      onEdit={handleEdit}
      onDelete={handleDelete}
    />
  );
}
