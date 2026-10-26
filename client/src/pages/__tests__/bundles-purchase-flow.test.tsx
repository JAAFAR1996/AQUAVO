import {beforeEach,describe,expect,it,vi} from "vitest";
import {render,screen,waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BundlesPage from "../bundles";

const state=vi.hoisted(()=>({
  addItems:vi.fn(),addItem:vi.fn(),
  products:[{id:"filter",slug:"filter",name:"Sponge filter",price:3000,stock:5,hasVariants:true,
    variants:[{id:"small",label:"Small",price:3000,stock:5},{id:"large",label:"Large",price:4000,stock:0},{id:"archived",label:"Old",price:1000,stock:9,isArchived:true},{id:"pending",label:"Pending size",price:0,stock:0,priceStatus:"pending"}]}],
  bundles:[{id:"kit",slug:"filter-maintenance-pack",nameAr:"Kit",descriptionAr:"",bundlePrice:3000,inStock:true,requiresVariantSelection:true,
    items:[{productId:"filter",variantId:null,variantLabel:null,quantity:1,required:true,name:"Sponge filter",slug:"filter",price:3000,stock:5,hasVariants:true}]}]
}));
vi.mock("@/i18n/locale-context",()=>({useLocale:()=>({locale:"en",dir:"ltr",intl:"en",href:(p:string)=>"/en"+p})}));
vi.mock("@/components/seo/meta-tags",()=>({MetaTags:()=>null}));
vi.mock("@/contexts/cart-context",()=>({useCart:()=>({addItems:state.addItems,addItem:state.addItem,items:[]})}));
vi.mock("@tanstack/react-query",()=>({useQuery:({queryKey}:{queryKey:string[]})=>({
 data:queryKey[0]==="growth-bundles"?state.bundles:{products:state.products},isLoading:false,isError:false,error:null
})}));
describe("bundle option purchase flow",()=>{
 beforeEach(()=>{state.addItems.mockReset();state.addItem.mockReset();state.addItems.mockResolvedValue(1);});
 it("requires an explicit available option and adds the exact variant",async()=>{
  const user=userEvent.setup();
  render(<BundlesPage/>);
  const select=screen.getByRole("combobox",{name:/Sponge filter/});
  expect(screen.getByRole("button",{name:"Choose item options above"})).toBeDisabled();
  expect(screen.getByRole("option",{name:/Large/})).toBeDisabled();
  expect(screen.queryByRole("option",{name:/Old/})).not.toBeInTheDocument();
  const pending=screen.getByRole("option",{name:/Pending size/});
  expect(pending).toBeDisabled();
  expect(pending.textContent).not.toMatch(/0/);
  await user.selectOptions(select,"small");
  const add=screen.getByRole("button",{name:"Add bundle to cart"});
  expect(add).toBeEnabled();
  await user.click(add);
  await waitFor(()=>expect(state.addItems).toHaveBeenCalledOnce());
  expect(state.addItems.mock.calls[0][0][0]).toMatchObject({_variantId:"small",price:3000,stock:5});
  expect(screen.getByRole("button",{name:"Bundle added"})).toBeInTheDocument();
 });
 it("reports an unsuccessful bundle addition rather than a false success",async()=>{
  state.addItems.mockResolvedValue(0);
  const user=userEvent.setup();render(<BundlesPage/>);
  await user.selectOptions(screen.getByRole("combobox"),"small");
  await user.click(screen.getByRole("button",{name:"Add bundle to cart"}));
  expect(await screen.findByRole("alert")).toHaveTextContent("The full bundle was not added");
  expect(screen.queryByRole("button",{name:"Bundle added"})).not.toBeInTheDocument();
 });
});
