import Head from "next/head";
import React from "react";

type Props = {
  description: string;
  title: string;
  children?: React.ReactNode;
};

function HeadComponent({ description, title, children }: Props) {
  return (
    <Head>
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width,initial-scale=1.0" />
      <meta name="theme-color" content="#000000" />
      <meta name="description" content={description} />
      <meta name="robots" content="follow,index,max-snippet:-1,max-video-preview:-1,max-image-preview:large" />
      <link rel="icon" href="/favicon.ico" />
      <title>{title} | Grace Arena Resorts</title>
      {children}
    </Head>
  );
}

export default HeadComponent;
