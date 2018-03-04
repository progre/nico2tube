import { Button, Grid, TextField } from 'material-ui';
import React from 'react';

export interface Props {
  style?: React.CSSProperties;

  onAddClick(value: string): void;
}

export default class TextAdd extends React.Component<Props> {
  private input?: HTMLInputElement;

  constructor(props: Props, context?: any) {
    super(props, context);

    this.inputRef = this.inputRef.bind(this);
    this.onClick = this.onClick.bind(this);
  }

  render() {
    return (
      <Grid container spacing={24} style={this.props.style}>
        <Grid item xs={10}>
          <TextField
            inputRef={this.inputRef}
            label="Niconico URL"
            fullWidth={true}
          />
        </Grid>
        <Grid item xs={2} style={{ textAlign: 'center' }}>
          <Button
            variant="fab"
            mini
            style={{ display: 'inline-block' }}
            onClick={this.onClick}
          >+</Button>
        </Grid>
      </Grid>
    );
  }

  private inputRef(input: HTMLInputElement) {
    this.input = input;
  }

  private onClick() {
    if (this.input == null) {
      return;
    }
    const text = this.input.value || '';
    this.input.value = '';
    this.props.onAddClick(text);
  }
}
