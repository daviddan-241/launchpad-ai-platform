import { PaymentRequestForm } from "@/components/payment-request-form";
import { PaymentRequestList } from "@/components/payment-request-list";
import { requireCurrentUser } from "@/lib/auth";
import { readStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  const user = await requireCurrentUser();
  const store = await readStore();
  const requests = store.paymentRequests.filter((item) => item.userId === user.id);

  return (
    <div className="space-y-6">
      <section>
        <p className="text-xs uppercase tracking-[0.25em] text-fuchsia-300">Payments</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Revenue and approvals</h1>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-300">
          Prepare client payments, support part-pay or monthly agreements, and keep owner approval in the loop.
        </p>
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <PaymentRequestForm />
        <PaymentRequestList requests={requests} />
      </div>
    </div>
  );
}
