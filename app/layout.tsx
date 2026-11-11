import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'ADI — Form & Dimension',description:'Explore the graphic design and 3D experiments of Aditya Rathore. Two ways of seeing, one curious mind.',icons:{icon:'/favicon.svg'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
