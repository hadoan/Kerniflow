export { default as CustomersPage } from "./screens/CustomersPage";
export { default as NewCustomerPage } from "./screens/NewCustomerPage";
export { default as EditCustomerPage } from "./screens/EditCustomerPage";
export {
  customerFormSchema,
  getDefaultCustomerFormValues,
  toCreateCustomerInput,
  toUpdateCustomerInput,
  type CustomerFormData,
} from "./schemas/customer-form.schema";
