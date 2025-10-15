import { GetStripeCustomPlanModel } from "@root/shared/zod-schemas";
import { AnimatePresence } from "framer-motion";
import { FC } from "react";

const ChargeFailure: FC<{
  orderDetails: GetStripeCustomPlanModel;
}> = ({ orderDetails }) => {
  return (
    <div className='p-10 flex-col justify-center items-center text-center overflow-none relative'>
      <AnimatePresence>
        <div
          key='you-just-bought-failed-nooo'
          className='bg-background rounded-large p-8 fixed w-[500px] h-auto top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[100000] shadow'>
          <div>
            <h1 className='font-bold text-3xl mb-4'>Something went wrong 😕</h1>
            <p className='mb-3 opacity-80'>Payment did not go through or our system didn't capture it, if you believe your card has been charged please <a href='mailto:moeaymandev@gmail.com' target='_blank'>contact us</a> ASAP, can also message @moe_03 on discord.</p>
            <p className='block mb-3 opacity-80'>Also don't forget to message Moe (@moe_03) on <a target='_blank' href="https://discord.gg/XfGSgJDPUa">Discord</a> if you ever face any issues, always glad to help :D</p>
            <p className='text-sm opacity-80 mt-3'>InvoiceID: {orderDetails?.id} You can find all your purchase history in your account settings, if you need any help feel free to contact us.</p>
          </div>
        </div>
      </AnimatePresence>
    </div>
  );
};

export default ChargeFailure;