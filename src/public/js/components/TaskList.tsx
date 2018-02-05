import { List, ListItem, ListItemText } from 'material-ui';
import React from 'react';
import TextAdd from './TextAdd';

export default function TaskList(props: {
  tasks: ReadonlyArray<string>;

  onAddClick(url: string): void;
}) {
  return (
    <>
      <TextAdd style={{ marginTop: '60px' }} onAddClick={props.onAddClick} />
      <List>
        {props.tasks.map(x => (
          <ListItem button key={x}>
            <ListItemText inset primary={x} />
          </ListItem>
        ))}
      </List>
    </>
  );
}
