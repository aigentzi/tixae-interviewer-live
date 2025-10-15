"use client";

import { useState } from "react";
import { api } from "@root/trpc/react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Card,
  CardBody,
  Chip,
  User,
  Spinner,
} from "@heroui/react";
import { CheckIcon } from "lucide-react";

interface ChangePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    id: string;
    email: string;
    name?: string;
    plan?: {
      name: string | null;
      key: string | null;
      status: string | null;
    };
  };
  onSuccess?: () => void;
}

interface StripeProduct {
  id: string;
  name: string;
  description: string | null;
  metadata: Record<string, string>;
  prices: Array<{
    id: string;
    unit_amount: number | null;
    currency: string;
    recurring: {
      interval: string;
      interval_count: number;
    } | null;
  }>;
}

export function ChangePlanModal({
  isOpen,
  onClose,
  user,
  onSuccess,
}: ChangePlanModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<StripeProduct | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const { data: products, isLoading } = api.admin.getStripeProducts.useQuery(
    undefined,
    { enabled: isOpen },
  );

  const createSubscriptionMutation =
    api.admin.createUserSubscription.useMutation({
      onSuccess: () => {
        onSuccess?.();
        onClose();
        setSelectedPlan(null);
        setIsCreating(false);
      },
      onError: (error) => {
        console.error("Failed to create subscription:", error);
        setIsCreating(false);
      },
    });

  const handleCreateSubscription = async () => {
    if (!selectedPlan || !selectedPlan.prices[0]) return;

    setIsCreating(true);
    createSubscriptionMutation.mutate({
      userId: user.id,
      priceId: selectedPlan.prices[0].id,
      couponCode: "100OFF", // 100% coupon code
    });
  };

  const handleClose = () => {
    onClose();
    setSelectedPlan(null);
    setIsCreating(false);
  };

  const formatPrice = (price: StripeProduct["prices"][0]) => {
    if (!price.unit_amount) return "Free";
    const amount = price.unit_amount / 100;
    return `$${amount}/${price.recurring ? price.recurring.interval : "month"}`;
  };

  const getPlanFeatures = (product: StripeProduct) => {
    const features = [];
    if (product.metadata.pages)
      features.push(`${product.metadata.pages} pages`);
    if (product.metadata.edits)
      features.push(`${product.metadata.edits} edits`);
    if (product.metadata.chapters)
      features.push(`${product.metadata.chapters} chapters`);
    if (product.metadata.voice_minutes)
      features.push(`${product.metadata.voice_minutes} voice minutes`);
    if (
      product.metadata.collaborative_books &&
      product.metadata.collaborative_books === "true"
    ) {
      features.push("Collaborative books");
    }
    return features;
  };

  const isPlanActive = (product: StripeProduct) => {
    return user.plan?.name === product.name;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size="5xl"
      scrollBehavior="inside"
      placement="center"
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold">Change User Plan</h2>
          </div>
          <User
            name={user.name || user.email}
            description={user.email}
            avatarProps={{
              src: `https://api.dicebear.com/7.x/initials/svg?seed=${user.email}`,
            }}
          />
          <div className="flex items-center gap-2 mt-2">
            <span className="text-sm text-gray-600">Current plan:</span>
            <Chip
              color={user.plan?.name ? "primary" : "default"}
              variant="flat"
              size="sm"
            >
              {user.plan?.name || "Free"}
            </Chip>
          </div>
        </ModalHeader>

        <ModalBody>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner size="lg" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products?.map((product) => {
                const isActive = isPlanActive(product);
                const features = getPlanFeatures(product);

                return (
                  <Card
                    key={product.id}
                    className={`cursor-pointer transition-all border-2 ${
                      selectedPlan?.id === product.id
                        ? "border-primary bg-primary/5"
                        : isActive
                          ? "border-success bg-success/5"
                          : "border-default-200 hover:border-default-300"
                    }`}
                    isPressable
                    onPress={() => !isActive && setSelectedPlan(product)}
                  >
                    <CardBody className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-lg">
                            {product.name}
                          </span>
                          {isActive && (
                            <Chip
                              color="success"
                              size="sm"
                              startContent={<CheckIcon className="w-3 h-3" />}
                            >
                              Current
                            </Chip>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-500 line-through">
                            {product.prices[0]
                              ? formatPrice(product.prices[0])
                              : "N/A"}
                          </div>
                          <div className="font-bold text-success">FREE</div>
                        </div>
                      </div>

                      {product.description && (
                        <p className="text-sm text-gray-600 mb-3">
                          {product.description}
                        </p>
                      )}

                      <div className="space-y-2">
                        {features.map((feature, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-2 text-sm"
                          >
                            <CheckIcon className="w-4 h-4 text-success flex-shrink-0" />
                            <span>{feature}</span>
                          </div>
                        ))}
                      </div>

                      {selectedPlan?.id === product.id && (
                        <div className="mt-3 p-2 bg-primary/10 rounded-lg">
                          <p className="text-xs text-primary font-medium">
                            Selected for upgrade
                          </p>
                        </div>
                      )}
                    </CardBody>
                  </Card>
                );
              })}
            </div>
          )}
        </ModalBody>

        <ModalFooter>
          <Button variant="light" onPress={handleClose}>
            Cancel
          </Button>
          <Button
            color="primary"
            onPress={handleCreateSubscription}
            isLoading={isCreating}
            isDisabled={!selectedPlan || isLoading}
          >
            {isCreating ? "Creating Subscription..." : "Update Plan"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
