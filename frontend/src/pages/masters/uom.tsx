import { useState } from "react";
import {
  useListUom,
  useCreateUom,
  useUpdateUom,
  useDeleteUom,
  getListUomQueryKey,
} from "@/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { MasterPage } from "./master-page";

export default function Uom() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useListUom({ search: search || undefined, page, limit: 20 });
  const create = useCreateUom();
  const update = useUpdateUom();
  const remove = useDeleteUom();

  async function handleAdd(name: string) {
    await new Promise<void>((resolve, reject) => {
      create.mutate({ data: { name } }, {
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListUomQueryKey() }); resolve(); },
        onError: reject,
      });
    });
  }

  async function handleEdit(id: number, name: string) {
    await new Promise<void>((resolve, reject) => {
      update.mutate({ id, data: { name } }, {
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListUomQueryKey() }); resolve(); },
        onError: reject,
      });
    });
  }

  async function handleDelete(id: number) {
    await new Promise<void>((resolve, reject) => {
      remove.mutate({ id }, {
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListUomQueryKey() }); resolve(); },
        onError: reject,
      });
    });
  }

  return (
    <MasterPage
      title="Units of Measure"
      items={data?.data}
      total={data?.total}
      isLoading={isLoading}
      isError={isError}
      page={page}
      setPage={setPage}
      search={search}
      setSearch={setSearch}
      queryKey={getListUomQueryKey()}
      onAdd={handleAdd}
      onEdit={handleEdit}
      onDelete={handleDelete}
    />
  );
}
