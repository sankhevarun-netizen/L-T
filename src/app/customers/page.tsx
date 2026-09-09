import { CustomerDirectory } from '@/components/customer/customer-directory'

/**
 * The Customer 360 landing.
 *
 * `/customers` resolved a header title long before it had a page behind it —
 * the entry existed so that drilling into `/customers/<id>` had something to
 * name the screen with. Now the route is in the rail, so it needs to answer.
 */
export default function CustomersRoute() {
  return <CustomerDirectory />
}
