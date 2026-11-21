import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ProfileAddresses } from "../profile-addresses";
import { createUserAddressInput, updateUserAddressInput } from "@shared/user-address-input";
const toast = vi.hoisted(() => vi.fn());
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast }) }));

describe("saved delivery addresses", () => {
  it("keeps the form and values after a failed save, without announcing success", async () => {
    let reject!: (reason: Error) => void;
    const add = vi.fn(() => new Promise<void>((_resolve, fail) => { reject = fail; }));
    render(<ProfileAddresses addresses={[]} onAddAddress={add} onUpdateAddress={vi.fn()} onDeleteAddress={vi.fn()} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /إضافة عنوان/ }));
    const inputs = screen.getAllByRole("textbox");
    fireEvent.change(inputs[0], { target: { value: "البيت" } });
    fireEvent.change(inputs[1], { target: { value: "بغداد - شارع الاختبار" } });
    fireEvent.change(inputs[2], { target: { value: "07700000000" } });
    const save = screen.getByRole("button", { name: "إضافة" });
    await user.click(save);
    expect(save).toBeDisabled();
    expect(toast).not.toHaveBeenCalled();
    await act(async () => reject(new Error("Offline")));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(inputs[1]).toHaveValue("بغداد - شارع الاختبار");
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ variant: "destructive" }));
    expect(save).toBeEnabled();
    expect(add).toHaveBeenCalledWith(expect.objectContaining({ phone: "07700000000" }));
  });

  it("maps both address payload versions to addressLine1 and persists the phone", () => {
    const value = { label: "Home", address: " Baghdad ", phone: "07700000000", isDefault: true };
    expect(createUserAddressInput.parse(value)).toMatchObject({ addressLine1: "Baghdad", phone: "07700000000", country: "Iraq" });
    const update = updateUserAddressInput.parse({ address: " Basra ", phone: "07800000000" });
    expect(update).toEqual({ addressLine1: "Basra", phone: "07800000000" });
    expect(updateUserAddressInput.safeParse({ isDefault: "false" }).success).toBe(false);
    expect(createUserAddressInput.safeParse({ ...value, userId: "someone-else" }).success).toBe(false);
    expect(updateUserAddressInput.safeParse({ addressLine1: " " }).success).toBe(false);
    expect(updateUserAddressInput.parse({ phone: "" })).toEqual({ phone: null });
  });
});
