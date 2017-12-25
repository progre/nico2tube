import List, { ListItem, ListItemText } from 'material-ui/List';
import * as React from 'react';

export default function ErrorList(props: { errors: ReadonlyArray<string>; }) {
  return (
    <>
    <List>
      {props.errors.map((x, i) => (
        <ListItem button key={i}>
          <ListItemText inset primary={x} />
        </ListItem>
      ))}
    </List>
    </>
  );
}
