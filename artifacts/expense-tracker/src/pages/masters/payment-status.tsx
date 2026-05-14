import { useState } from "react";
import {
  useListPaymentStatuses,
  useCreatePaymentStatus,
  useUpdatePaymentStatus,
  useDeletePaymentStatus,
  getListPaymentStatusesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { MasterPage } from "./master-page";

export default function PaymentStatus() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data, isLoading } = useListPaymentStatuses({ search: search || undefined, page, limit: 20 });
  const create = useCreatePaymentStatus();
  const update = useUpdatePaymentStatus();
  const remove = useDeletePaymentStatus();

  async function handleAdd(name: string) {
    await new Promise<void>((resolve, reject) => {
      create.mutate({ data: { name } }, {
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListPaymentStatusesQueryKey() }); resolve(); },
        onError: reject,
      });
    });
  }

  async function handleEdit(id: number, name: string) {
    await new Promise<void>((resolve, reject) => {
      update.mutate({ id, data: { name } }, {
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListPaymentStatusesQueryKey() }); resolve(); },
        onError: reject,
      });
    });
  }

  async function handleDelete(id: number) {
    await new Promise<void>((resolve, reject) => {
      remove.mutate({ id }, {
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListPaymentStatusesQueryKey() }); resolve(); },
        onError: reject,
      });
    });
  }

  return (
    <MasterPage
      title="Payment Statuses"
      items={data?.data}
      total={data?.total}
      isLoading={isLoading}
      page={page}
      setPage={setPage}
      search={search}
      setSearch={setSearch}
      queryKey={getListPaymentStatusesQueryKey()}
      onAdd={handleAdd}
      onEdit={handleEdit}
      onDelete={handleDelete}
    />
  );
}
