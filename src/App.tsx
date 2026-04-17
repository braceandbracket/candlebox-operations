import React, { useEffect, useState } from "react";
import "./App.css";
import mondaySdk from "monday-sdk-js";
import "@vibe/core/tokens";
import { AttentionBox } from "@vibe/core";
import type { MondayContext, MondayListenResponse } from "@/types/monday";

// Usage of mondaySDK example, for more information visit here: https://developer.monday.com/apps/docs/introduction-to-the-sdk/
const monday = mondaySdk();

const App = () => {
  const [context, setContext] = useState<MondayContext | null>(null);

  useEffect(() => {
    // Notice this method notifies the monday platform that user gains a first value in an app.
    // Read more about it here: https://developer.monday.com/apps/docs/mondayexecute#value-created-for-user/
    monday.execute("valueCreatedForUser");
    monday.setApiVersion("2023-10");

    // TODO: set up event listeners, Here`s an example, read more here: https://developer.monday.com/apps/docs/mondaylisten/
    monday.listen<MondayContext>("context", (res: MondayListenResponse<MondayContext>) => {
      setContext(res.data);
    });
  }, []);

  // Some example what you can do with context, read more here: https://developer.monday.com/apps/docs/mondayget#requesting-context-and-settings-data
  const attentionBoxText = `Hello, your user_id is: ${
    context ? context.user.id : "still loading"
  }.
  Let's start building your amazing app, which will change the world!`;

  return (
    <div className="App">
      <AttentionBox title="Hello Monday Apps!" text={attentionBoxText} type="success" />
    </div>
  );
};

export default App;
